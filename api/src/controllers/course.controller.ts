import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

export async function list() {
  const items = await prisma.course.findMany({ orderBy: { createdAt: 'desc' } })
  return { courses: items }
}

export async function getById(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const item = await prisma.course.findUnique({
    where: { id },
    include: {
      modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
      assistant: true,
    },
  })
  if (!item) return reply.status(404).send({ error: 'Not found' })
  return { course: item }
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { name: string; description?: string; active?: boolean; assistantId?: string }
  if (!body.name) return reply.status(400).send({ error: 'name is required' })

  const item = await prisma.course.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      active: body.active ?? false,
      ...(body.assistantId !== undefined && { assistantId: body.assistantId }),
    },
  })
  return { course: item }
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const body = request.body as { name?: string; description?: string; active?: boolean; assistantId?: string | null }

  const existing = await prisma.course.findUnique({ where: { id } })
  if (!existing) return reply.status(404).send({ error: 'Not found' })

  const item = await prisma.course.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.assistantId !== undefined && { assistantId: body.assistantId }),
    },
    include: {
      modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
      assistant: true,
    },
  })
  return { course: item }
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  try {
    await prisma.course.delete({ where: { id } })
  } catch {
    return reply.status(404).send({ error: 'Not found' })
  }
  return { success: true }
}
