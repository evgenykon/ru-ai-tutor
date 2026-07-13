import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'
import { synthesize, commitTtsCache } from '../services/tts.service'

interface TtsBody {
  text?: string
  voice?: string
  model?: string
  speed?: number
  courseId?: string
  cache?: boolean
}

export async function ttsSynthesize(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as TtsBody

  const text = body.text?.trim() || 'Привет, я ваш ассистент.'
  if (!body.voice) return reply.status(400).send({ error: 'voice is required' })
  if (!body.model) return reply.status(400).send({ error: 'model is required' })

  try {
    const result = await synthesize({
      text,
      voice: body.voice,
      model: body.model,
      speed: body.speed ?? 1,
      courseId: body.courseId,
      cache: body.cache,
    })

    if (result.hash) {
      reply.header('X-TTS-Hash', result.hash)
      reply.header('X-TTS-Cached', String(result.cached))
    }
    reply.header('Content-Type', 'audio/ogg')
    reply.header('Content-Length', String(result.buffer.byteLength))
    await logTtsUsage(body.voice, text, result.cached)
    return reply.send(result.buffer)
  } catch (e: any) {
    return reply.status(502).send({ error: e.message || 'TTS failed' })
  }
}

async function logTtsUsage(voice: string, text: string, cached: boolean) {
  try {
    const chars = text.length
    const cost = cached ? 0 : (chars / 1000000) * 0.016
    await prisma.usageLog.create({
      data: {
        service: cached ? 'yandex-tts-cache' : 'yandex',
        model: `tts:${voice}`,
        tokens: chars,
        cost,
        endpoint: 'tts',
        status: 200,
      },
    })
  } catch { /* empty */ }
}

interface TtsCacheCommitBody {
  courseId?: string
  hash?: string
}

export async function ttsCacheCommit(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as TtsCacheCommitBody
  if (!body.courseId || !body.hash) {
    return reply.status(400).send({ error: 'courseId and hash are required' })
  }

  try {
    const ok = await commitTtsCache(body.courseId, body.hash)
    return reply.send({ ok })
  } catch (e: any) {
    return reply.status(500).send({ error: e.message || 'Failed to commit TTS cache' })
  }
}
