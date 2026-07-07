import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

export async function listByCourse(request: FastifyRequest) {
  const { courseId } = request.params as { courseId: string }
  const items = await prisma.module.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    include: { lessons: { orderBy: { order: 'asc' } } },
  })
  return { modules: items }
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const { courseId } = request.params as { courseId: string }
  const body = request.body as { name: string; order?: number }

  if (!body.name) return reply.status(400).send({ error: 'name is required' })

  const item = await prisma.module.create({
    data: { courseId, name: body.name, order: body.order ?? 0 },
    include: { lessons: { orderBy: { order: 'asc' } } },
  })
  return { module: item }
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const body = request.body as { name?: string; order?: number }

  const existing = await prisma.module.findUnique({ where: { id } })
  if (!existing) return reply.status(404).send({ error: 'Not found' })

  const item = await prisma.module.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.order !== undefined && { order: body.order }),
    },
    include: { lessons: { orderBy: { order: 'asc' } } },
  })
  return { module: item }
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  try {
    await prisma.module.delete({ where: { id } })
  } catch {
    return reply.status(404).send({ error: 'Not found' })
  }
  return { success: true }
}
