import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

export async function models(request: FastifyRequest, reply: FastifyReply) {
  const cred = await prisma.serviceCredential.findUnique({ where: { service: 'open-router' } })
  if (!cred) return reply.status(400).send({ error: 'Open Router key not configured' })

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${cred.keyValue}` },
    })
    if (!res.ok) throw new Error(`OpenRouter returned ${res.status}`)
    const json = await res.json() as { data: { id: string; name?: string }[] }
    return { models: json.data.map((m) => ({ id: m.id, name: m.name || m.id })) }
  } catch (e: any) {
    reply.status(502).send({ error: e.message || 'Failed to fetch models' })
  }
}

export async function list(request: FastifyRequest) {
  const userAssistantIds = await prisma.userAssistant.findMany({
    where: { userId: request.user!.userId },
    select: { assistantId: true },
  }).then(r => r.map(ua => ua.assistantId))
  if (!userAssistantIds.length) return { assistants: [] }
  const items = await prisma.assistant.findMany({ where: { id: { in: userAssistantIds } }, orderBy: { createdAt: 'desc' } })
  return { assistants: items }
}

export async function getById(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const item = await prisma.assistant.findFirst({ where: { id, users: { some: { userId: request.user!.userId } } } })
  if (!item) return reply.status(404).send({ error: 'Not found' })
  return { assistant: item }
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as {
    name: string
    prompt: string
    model: string
    temperature?: number
    service?: string
    active?: boolean
  }

  if (!body.name || !body.prompt || !body.model) {
    return reply.status(400).send({ error: 'name, prompt and model are required' })
  }

  const item = await prisma.assistant.create({
    data: {
      name: body.name,
      prompt: body.prompt,
      model: body.model,
      temperature: body.temperature ?? 0.7,
      service: body.service ?? 'open-router',
      active: body.active ?? true,
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
    service?: string
    active?: boolean
  }

  const existing = await prisma.assistant.findFirst({ where: { id, users: { some: { userId: request.user!.userId } } } })
  if (!existing) return reply.status(404).send({ error: 'Not found' })

  const item = await prisma.assistant.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.prompt !== undefined && { prompt: body.prompt }),
      ...(body.model !== undefined && { model: body.model }),
      ...(body.temperature !== undefined && { temperature: body.temperature }),
      ...(body.service !== undefined && { service: body.service }),
      ...(body.active !== undefined && { active: body.active }),
    },
  })

  return { assistant: item }
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const existing = await prisma.assistant.findFirst({ where: { id, users: { some: { userId: request.user!.userId } } } })
  if (!existing) return reply.status(404).send({ error: 'Not found' })
  await prisma.assistant.delete({ where: { id } })
  return { success: true }
}
