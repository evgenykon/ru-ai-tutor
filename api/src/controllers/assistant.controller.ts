import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

export async function list(request: FastifyRequest) {
  const isAdmin = request.user!.email === 'admin@admin.com'
  const where = isAdmin ? {} : {}
  if (!isAdmin) {
    const userAssistantIds = await prisma.userAssistant.findMany({
      where: { userId: request.user!.userId },
      select: { assistantId: true },
    }).then(r => r.map(ua => ua.assistantId))
    if (!userAssistantIds.length) return { assistants: [] }
    where.id = { in: userAssistantIds }
  }
  const items = await prisma.assistant.findMany({ where, orderBy: { createdAt: 'desc' } })
  return { assistants: items }
}

export async function getById(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const isAdmin = request.user!.email === 'admin@admin.com'
  const item = await prisma.assistant.findFirst({ where: { id, ...(isAdmin ? {} : { users: { some: { userId: request.user!.userId } } }) } })
  if (!item) return reply.status(404).send({ error: 'Not found' })
  return { assistant: item }
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as {
    name: string
    prompt?: string
    model?: string
    ttsModel?: string | null
    ttsVoice?: string | null
    ttsRole?: string | null
    ttsPitch?: number | null
    temperature?: number
    active?: boolean
    speechRate?: number | null
  }

  if (!body.name) {
    return reply.status(400).send({ error: 'name is required' })
  }

  const [yandexKey, llmKey] = await Promise.all([
    prisma.serviceCredential.findUnique({ where: { service: 'yandex' } }),
    prisma.serviceCredential.findFirst({ where: { service: { in: ['yandex-ai', 'proxyapi'] } } }),
  ])
  if (!yandexKey || !llmKey) return reply.status(400).send({ error: 'Добавьте ключи синтеза речи и LLM' })

  const item = await prisma.assistant.create({
    data: {
      name: body.name,
      prompt: body.prompt || 'Ты — полезный ассистент',
      model: body.model || '',
      temperature: body.temperature ?? 0.7,
      active: body.active ?? true,
      ...(body.speechRate !== undefined && { speechRate: body.speechRate }),
      ...(body.ttsModel !== undefined && { ttsModel: body.ttsModel }),
      ...(body.ttsVoice !== undefined && { ttsVoice: body.ttsVoice }),
      ...(body.ttsRole !== undefined && { ttsRole: body.ttsRole }),
      ...(body.ttsPitch !== undefined && { ttsPitch: body.ttsPitch }),
      users: { create: { userId: request.user!.userId } },
    },
  })

  return { assistant: item }
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const body = request.body as {
    name?: string
    prompt?: string
    model?: string
    temperature?: number
    active?: boolean
    avatar?: string | null
    speechRate?: number | null
    ttsModel?: string | null
    ttsVoice?: string | null
    ttsRole?: string | null
    ttsPitch?: number | null
  }

  const isAdmin = request.user!.email === 'admin@admin.com'
  const existing = await prisma.assistant.findFirst({ where: { id, ...(isAdmin ? {} : { users: { some: { userId: request.user!.userId } } }) } })
  if (!existing) return reply.status(404).send({ error: 'Not found' })

  const item = await prisma.assistant.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.prompt !== undefined && { prompt: body.prompt }),
      ...(body.model !== undefined && { model: body.model }),
      ...(body.temperature !== undefined && { temperature: body.temperature }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.avatar !== undefined && { avatar: body.avatar }),
      ...(body.speechRate !== undefined && { speechRate: body.speechRate }),
      ...(body.ttsModel !== undefined && { ttsModel: body.ttsModel }),
      ...(body.ttsVoice !== undefined && { ttsVoice: body.ttsVoice }),
    },
  })

  return { assistant: item }
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const isAdmin = request.user!.email === 'admin@admin.com'
  const existing = await prisma.assistant.findFirst({ where: { id, ...(isAdmin ? {} : { users: { some: { userId: request.user!.userId } } }) } })
  if (!existing) return reply.status(404).send({ error: 'Not found' })
  await prisma.assistant.delete({ where: { id } })
  return { success: true }
}
