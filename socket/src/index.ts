interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const sessions = new Map<string, Set<WebSocket>>()
const chatHistory = new Map<string, ChatMessage[]>()
const pendingTtsByClient = new Map<WebSocket, Set<string>>()

interface TtsParams {
  text: string
  voice: string
  model: string
  speed: number
  courseId?: string
}

function hasPendingTtsHash(clients: Set<WebSocket>, hash: string): boolean {
  for (const client of clients) {
    if (pendingTtsByClient.get(client)?.has(hash)) return true
  }
  return false
}

async function synthesizeAndBroadcastTts(
  sessionId: string,
  params: TtsParams,
  clients: Set<WebSocket>,
  sendText?: string,
): Promise<void> {
  const startTime = Date.now()
  const res = await fetch('http://api:3001/internal/tts/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, cache: false }),
  })
  if (!res.ok) {
    console.log(`[session ${sessionId}] tts-error: status=${res.status}`)
    throw new Error(`TTS failed: ${res.status}`)
  }

  const cached = res.headers.get('X-TTS-Cached') === 'true'
  const hash = res.headers.get('X-TTS-Hash')
  const audio = await res.arrayBuffer()
  console.log(`[session ${sessionId}] tts-response: ${(audio.byteLength / 1024).toFixed(1)}kb in ${Date.now() - startTime}ms`)

  if (sendText) {
    const textMsg = JSON.stringify({ type: 'tts-text', text: sendText })
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(textMsg)
      }
    }
  }

  let sent = false
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(audio)
      sent = true
      const pending = pendingTtsByClient.get(client) ?? new Set()
      pendingTtsByClient.set(client, pending)
      pending.add(hash)
    }
  }

  if (!cached && sent && params.courseId && hash) {
    await new Promise(resolve => setTimeout(resolve, 0))
    if (hasPendingTtsHash(clients, hash)) {
      await fetch('http://api:3001/internal/tts/cache/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: params.courseId, hash }),
      }).catch(() => {})
    }
  }
}

const server = Bun.serve({
  port: 3002,
  fetch(req) {
    const url = new URL(req.url)

    if (url.pathname === '/health' || url.pathname === '/socket/health') {
      return new Response('ok')
    }

    if (url.pathname === '/' || url.pathname === '/socket') {
      const sessionId = url.searchParams.get('sessionId')
      if (!sessionId) return new Response('sessionId required', { status: 400 })

      const success = server.upgrade(req, { data: { sessionId } })
      if (success) return
      return new Response('WebSocket upgrade failed', { status: 400 })
    }

    return new Response('Not Found', { status: 404 })
  },
  websocket: {
    open(ws) {
      const sessionId = ws.data.sessionId
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, new Set())
      }
      sessions.get(sessionId)!.add(ws)
      pendingTtsByClient.set(ws, new Set())
      console.log(`client connected to session ${sessionId}`)
    },
    async message(ws, message) {
      const sessionId = ws.data.sessionId
      const clients = sessions.get(sessionId)
      if (!clients) return

      if (typeof message !== 'string') {
        for (const client of clients) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message)
          }
        }
        return
      }

      let parsed: any
      try {
        parsed = JSON.parse(message)
      } catch {
        ws.send(JSON.stringify({ type: 'error', payload: 'invalid JSON' }))
        return
      }

      // Broadcast all JSON messages to other clients
      const textJson = JSON.stringify(parsed)
      for (const client of clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(textJson)
        }
      }

      if (parsed.type === 'tts-request') {
        console.log(`[session ${sessionId}] tts-request: text=${(parsed.text || '').slice(0, 50)}..., voice=${parsed.voice}, model=${parsed.model}, speed=${parsed.speed ?? 1}`)
        try {
          await synthesizeAndBroadcastTts(sessionId, {
            text: parsed.text,
            voice: parsed.voice,
            model: parsed.model,
            speed: parsed.speed ?? 1,
            courseId: parsed.courseId,
          }, clients, parsed.text)
        } catch (e: any) {
          ws.send(JSON.stringify({ type: 'tts-error', payload: e.message || 'TTS failed' }))
        }
        return
      }

      if (parsed.type === 'user-message') {
        console.log(`[session ${sessionId}] user-message: ${(parsed.text || '').slice(0, 60)}...`)
        if (!parsed.assistantId) {
          ws.send(JSON.stringify({ type: 'error', payload: 'assistantId required' }))
          return
        }

        if (!chatHistory.has(sessionId)) {
          chatHistory.set(sessionId, [])
        }
        const history = chatHistory.get(sessionId)!
        history.push({ role: 'user', content: parsed.text })
        if (history.length > 20) history.splice(0, history.length - 20)

        try {
          const llmRes = await fetch('http://api:3001/internal/llm/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assistantId: parsed.assistantId,
              messages: history.slice(-10),
            }),
          })

          if (!llmRes.ok) {
            const err = await llmRes.text().catch(() => '')
            console.log(`[session ${sessionId}] llm-error: ${llmRes.status} ${err.slice(0, 200)}`)
            ws.send(JSON.stringify({ type: 'error', payload: 'LLM failed' }))
            return
          }

          const llmJson: any = await llmRes.json()
          const replyText = llmJson.text || ''

          history.push({ role: 'assistant', content: replyText })

          // Broadcast assistant message to all clients
          const assistMsg = JSON.stringify({ type: 'assistant-message', text: replyText })
          for (const client of clients) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(assistMsg)
            }
          }

          // If TTS voice is configured, synthesize and broadcast audio
          if (parsed.voice) {
            try {
              await synthesizeAndBroadcastTts(sessionId, {
                text: replyText,
                voice: parsed.voice,
                model: parsed.model,
                speed: parsed.speed ?? 1,
                courseId: parsed.courseId,
              }, clients)
            } catch (e: any) {
              console.log(`[session ${sessionId}] tts-error: ${e.message || 'TTS failed'}`)
            }
          }
        } catch (e: any) {
          ws.send(JSON.stringify({ type: 'error', payload: e.message || 'LLM failed' }))
        }
        return
      }
    },
    close(ws) {
      const sessionId = ws.data.sessionId
      pendingTtsByClient.delete(ws)
      const clients = sessions.get(sessionId)
      if (clients) {
        clients.delete(ws)
        if (clients.size === 0) {
          sessions.delete(sessionId)
          chatHistory.delete(sessionId)
        }
      }
      console.log(`client disconnected from session ${sessionId}`)
    },
  },
})

console.log(`Socket server listening on :${server.port}`)
