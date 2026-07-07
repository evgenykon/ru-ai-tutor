import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const { moduleId } = request.params as { moduleId: string }
  const body = request.body as { title: string; order?: number }

  if (!body.title) return reply.status(400).send({ error: 'title is required' })

  const item = await prisma.lesson.create({
    data: { moduleId, title: body.title, order: body.order ?? 0 },
  })
  return { lesson: item }
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const body = request.body as { title?: string; order?: number }

  const existing = await prisma.lesson.findUnique({ where: { id } })
  if (!existing) return reply.status(404).send({ error: 'Not found' })

  const item = await prisma.lesson.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.order !== undefined && { order: body.order }),
    },
  })
  return { lesson: item }
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  try {
    await prisma.lesson.delete({ where: { id } })
  } catch {
    return reply.status(404).send({ error: 'Not found' })
  }
  return { success: true }
}
