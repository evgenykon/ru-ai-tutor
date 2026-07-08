const sessions = new Map<string, Set<WebSocket>>()

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
      console.log(`client connected to session ${sessionId}`)
    },
    async message(ws, message) {
      const sessionId = ws.data.sessionId
      const clients = sessions.get(sessionId)
      if (!clients) return

      // Handle binary (audio) messages
      if (typeof message !== 'string') {
        // Broadcast audio to all other clients in the session
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

      if (parsed.type === 'tts-request') {
        console.log(`[session ${sessionId}] tts-request: text=${(parsed.text || '').slice(0, 50)}..., voice=${parsed.voice}, speed=${parsed.speed ?? 1}`)
        try {
          const startTime = Date.now()
          const res = await fetch('http://api:3001/internal/tts/synthesize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: parsed.text,
              voice: parsed.voice,
              speed: parsed.speed ?? 1,
            }),
          })
          if (!res.ok) {
            console.log(`[session ${sessionId}] tts-error: status=${res.status}`)
            ws.send(JSON.stringify({ type: 'tts-error', payload: `TTS failed: ${res.status}` }))
            return
          }
          const audio = await res.arrayBuffer()
          console.log(`[session ${sessionId}] tts-response: ${(audio.byteLength / 1024).toFixed(1)}kb in ${Date.now() - startTime}ms`)
          const textMsg = JSON.stringify({ type: 'tts-text', text: parsed.text })
          for (const client of clients) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(textMsg)
              client.send(audio)
            }
          }
        } catch (e: any) {
          ws.send(JSON.stringify({ type: 'tts-error', payload: e.message || 'TTS failed' }))
        }
        return
      }

      // Broadcast JSON message to all other clients
      const text = JSON.stringify(parsed)
      for (const client of clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(text)
        }
      }
    },
    close(ws) {
      const sessionId = ws.data.sessionId
      const clients = sessions.get(sessionId)
      if (clients) {
        clients.delete(ws)
        if (clients.size === 0) sessions.delete(sessionId)
      }
      console.log(`client disconnected from session ${sessionId}`)
    },
  },
})

console.log(`Socket server listening on :${server.port}`)
