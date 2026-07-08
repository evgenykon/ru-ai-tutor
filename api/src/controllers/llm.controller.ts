import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chat(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as {
    messages?: ChatMessage[]
    assistantId?: string
  }

  if (!body.assistantId) return reply.status(400).send({ error: 'assistantId is required' })
  if (!body.messages?.length) return reply.status(400).send({ error: 'messages is required' })

  const assistant = await prisma.assistant.findUnique({ where: { id: body.assistantId } })
  if (!assistant) return reply.status(404).send({ error: 'Assistant not found' })

  const systemMsg: ChatMessage = { role: 'system', content: assistant.prompt }
  const allMessages = [systemMsg, ...body.messages]

  try {
    if (assistant.service === 'yandex-ai') {
      return await chatYandex(assistant, allMessages, reply)
    }
    return await chatOpenRouter(assistant, allMessages, reply)
  } catch (e: any) {
    return reply.status(502).send({ error: e.message || 'LLM failed' })
  }
}

export async function chatStream(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as {
    messages?: ChatMessage[]
    assistantId?: string
    model?: string
    systemPrompt?: string
  }

  if (!body.assistantId) return reply.status(400).send({ error: 'assistantId is required' })

  const assistant = await prisma.assistant.findUnique({ where: { id: body.assistantId } })
  if (!assistant) return reply.status(404).send({ error: 'Assistant not found' })

  const systemPrompt = body.systemPrompt || assistant.prompt
  const systemMsg: ChatMessage = { role: 'system', content: systemPrompt }
  const allMessages = body.messages?.length ? [systemMsg, ...body.messages] : [systemMsg]

  const model = body.model || assistant.model

  try {
    if (assistant.service === 'yandex-ai') {
      return await streamYandex(assistant, allMessages, reply, model)
    }
    return await streamOpenRouter(assistant, allMessages, reply, model)
  } catch (e: any) {
    return reply.status(502).send({ error: e.message || 'LLM stream failed' })
  }
}

async function chatOpenRouter(assistant: any, messages: ChatMessage[], reply: FastifyReply) {
  const cred = await prisma.serviceCredential.findUnique({ where: { service: 'proxyapi' } })
  if (!cred?.keyValue) return reply.status(400).send({ error: 'Ключ OpenRouter не настроен' })

  const proxyUrl = cred.folderId || 'https://openrouter.ai/api/v1/chat/completions'
  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cred.keyValue}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: assistant.model,
      messages,
      temperature: assistant.temperature ?? 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    return reply.status(502).send({ error: `OpenRouter: ${res.status} ${err.slice(0, 300)}` })
  }

  const json: any = await res.json()
  const text = json.choices?.[0]?.message?.content || ''

  await logUsage('open-router', assistant.model, json.usage)
  return { text }
}

async function streamOpenRouter(assistant: any, messages: ChatMessage[], reply: FastifyReply, modelOverride?: string) {
  const cred = await prisma.serviceCredential.findUnique({ where: { service: 'proxyapi' } })
  if (!cred?.keyValue) return reply.status(400).send({ error: 'Ключ OpenRouter не настроен' })

  const proxyUrl = cred.folderId || 'https://openrouter.ai/api/v1/chat/completions'
  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cred.keyValue}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelOverride || assistant.model,
      messages,
      temperature: assistant.temperature ?? 0.7,
      stream: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    return reply.status(502).send({ error: `OpenRouter: ${res.status} ${err.slice(0, 300)}` })
  }

  reply.hijack()
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  const reader = res.body?.getReader()
  if (!reader) {
    reply.raw.end()
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') break

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content || ''
        if (content) {
          reply.raw.write(`data: ${JSON.stringify({ text: content })}\n\n`)
        }
      } catch { /* skip malformed */ }
    }
  }

  reply.raw.write('data: [DONE]\n\n')
  reply.raw.end()
}

async function streamYandex(assistant: any, messages: ChatMessage[], reply: FastifyReply, modelOverride?: string) {
  const cred = await prisma.serviceCredential.findUnique({ where: { service: 'yandex-ai' } })
  if (!cred?.keyValue) return reply.status(400).send({ error: 'Ключ Yandex AI не настроен' })

  const headers: Record<string, string> = {
    Authorization: `Api-Key ${cred.keyValue}`,
    'Content-Type': 'application/json',
  }
  if (cred.folderId) headers['x-folder-id'] = cred.folderId

  const model = modelOverride || assistant.model || 'gpt://yandexgpt/latest'
  const oaiMessages = messages.map(m => ({ role: m.role, content: m.content }))

  const res = await fetch('https://ai.api.cloud.yandex.net/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: oaiMessages,
      temperature: assistant.temperature ?? 0.7,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    return reply.status(502).send({ error: `Yandex: ${res.status} ${err.slice(0, 300)}` })
  }

  const json: any = await res.json()
  const text = json.choices?.[0]?.message?.content || ''

  reply.hijack()
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })
  reply.raw.write(`data: ${JSON.stringify({ text })}\n\n`)
  reply.raw.write('data: [DONE]\n\n')
  reply.raw.end()
  await logUsage('yandex-ai', model, null).catch(() => {})
}

async function chatYandex(assistant: any, messages: ChatMessage[], reply: FastifyReply) {
  const cred = await prisma.serviceCredential.findUnique({ where: { service: 'yandex-ai' } })
  if (!cred?.keyValue) return reply.status(400).send({ error: 'Ключ Yandex AI не настроен' })

  const headers: Record<string, string> = {
    Authorization: `Api-Key ${cred.keyValue}`,
    'Content-Type': 'application/json',
  }
  if (cred.folderId) headers['x-folder-id'] = cred.folderId

  const model = assistant.model || 'gpt://yandexgpt/latest'
  const oaiMessages = messages.map(m => ({ role: m.role, content: m.content }))

  const res = await fetch('https://ai.api.cloud.yandex.net/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: oaiMessages,
      temperature: assistant.temperature ?? 0.7,
      max_tokens: 2000,
    }),
  })

  if (res.ok) {
    const json: any = await res.json()
    const text = json.choices?.[0]?.message?.content || ''
    await logUsage('yandex-ai', model, null)
    return { text }
  }

  const errText = await res.text().catch(() => '')
  return reply.status(502).send({ error: `Yandex AI: ${res.status} ${errText.slice(0, 300)}` })
}

async function logUsage(service: string, model: string, usage: any) {
  try {
    await prisma.usageLog.create({
      data: {
        service,
        model,
        tokens: usage?.total_tokens ?? null,
        cost: usage?.total_cost ?? null,
        endpoint: 'chat',
        status: 200,
      },
    })
  } catch { /* empty */ }
}
