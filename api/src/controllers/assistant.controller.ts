import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'
import { deleteCourseTtsCache } from '../services/tts.service'

export async function list(request: FastifyRequest) {
  const isAdmin = request.user!.email === 'admin@admin.com'
  const where: any = {}
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
  const item = await prisma.assistant.findFirst({
    where: { id, ...(isAdmin ? {} : { users: { some: { userId: request.user!.userId } } }) },
    include: { _count: { select: { courses: true } } },
  })
  if (!item) return reply.status(404).send({ error: 'Not found' })
  return { assistant: item, courseCount: item._count.courses }
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
    service?: string
    temperature?: number
    active?: boolean
    avatar?: string | null
    silenceVideo?: string | null
    talkVideo?: string | null
    praiseVideo?: string | null
    denialVideo?: string | null
    speechRate?: number | null
    ttsModel?: string | null
    ttsVoice?: string | null
    ttsRole?: string | null
    ttsPitch?: number | null
  }

  const isAdmin = request.user!.email === 'admin@admin.com'
  const existing = await prisma.assistant.findFirst({ where: { id, ...(isAdmin ? {} : { users: { some: { userId: request.user!.userId } } }) } })
  if (!existing) return reply.status(404).send({ error: 'Not found' })

  const ttsModelChanged = body.ttsModel !== undefined && body.ttsModel !== existing.ttsModel
  const ttsVoiceChanged = body.ttsVoice !== undefined && body.ttsVoice !== existing.ttsVoice
  const speechRateChanged = body.speechRate !== undefined && body.speechRate !== existing.speechRate
  const ttsSettingsChanged = ttsModelChanged || ttsVoiceChanged || speechRateChanged

  const item = await prisma.assistant.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.prompt !== undefined && { prompt: body.prompt }),
      ...(body.model !== undefined && { model: body.model }),
      ...(body.temperature !== undefined && { temperature: body.temperature }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.avatar !== undefined && { avatar: body.avatar }),
      ...(body.silenceVideo !== undefined && { silenceVideo: body.silenceVideo }),
      ...(body.talkVideo !== undefined && { talkVideo: body.talkVideo }),
      ...(body.praiseVideo !== undefined && { praiseVideo: body.praiseVideo }),
      ...(body.denialVideo !== undefined && { denialVideo: body.denialVideo }),
      ...(body.speechRate !== undefined && { speechRate: body.speechRate }),
      ...(body.ttsModel !== undefined && { ttsModel: body.ttsModel }),
      ...(body.ttsVoice !== undefined && { ttsVoice: body.ttsVoice }),
      ...(body.service !== undefined && { service: body.service }),
    },
  })

  if (ttsSettingsChanged) {
    const courses = await prisma.course.findMany({ where: { assistantId: id }, select: { id: true } })
    await Promise.all(courses.map(c => deleteCourseTtsCache(c.id).catch(() => {})))
  }

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
