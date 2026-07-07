import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

export async function synthesize(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as {
    text?: string
    voice?: string
    speed?: number
  }

  const text = body.text || 'Привет, я ваш ассистент.'
  if (!body.voice) return reply.status(400).send({ error: 'voice is required' })

  const cred = await prisma.serviceCredential.findUnique({ where: { service: 'yandex' } })
  if (!cred?.keyValue) return reply.status(400).send({ error: 'TTS key not configured' })

  const headers: Record<string, string> = {
    Authorization: `Api-Key ${cred.keyValue}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  if (cred.folderId) headers['x-folder-id'] = cred.folderId

  const params = new URLSearchParams({
    text,
    voice: body.voice,
    format: 'oggopus',
    speed: String(body.speed ?? 1),
  })

  try {
    const res = await fetch('https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize', {
      method: 'POST',
      headers,
      body: params,
    })

    if (!res.ok) {
      const err = await res.text().catch(() => '')
      return reply.status(502).send({ error: `TTS failed: ${res.status} ${err.slice(0, 200)}` })
    }

    const audio = await res.arrayBuffer()
    reply.header('Content-Type', 'audio/ogg')
    reply.header('Content-Length', String(audio.byteLength))
    return reply.send(Buffer.from(audio))
  } catch (e: any) {
    return reply.status(502).send({ error: e.message || 'TTS failed' })
  }
}
