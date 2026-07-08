import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

async function userCanAccessCourse(userId: string, courseId: string) {
  const course = await prisma.course.findFirst({ where: { id: courseId, users: { some: { userId } } } })
  return !!course
}

async function userCanAccessModule(userId: string, moduleId: string) {
  const mod = await prisma.module.findFirst({ where: { id: moduleId, course: { users: { some: { userId } } } } })
  return !!mod
}

export async function listByCourse(request: FastifyRequest, reply: FastifyReply) {
  const { courseId } = request.params as { courseId: string }
  if (!await userCanAccessCourse(request.user!.userId, courseId)) return reply.status(404).send({ error: 'Not found' })
  const items = await prisma.module.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    include: { lessons: { orderBy: { order: 'asc' } } },
  })
  return { modules: items }
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const { courseId } = request.params as { courseId: string }
  if (!await userCanAccessCourse(request.user!.userId, courseId)) return reply.status(404).send({ error: 'Not found' })
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
  if (!await userCanAccessModule(request.user!.userId, id)) return reply.status(404).send({ error: 'Not found' })
  const body = request.body as { name?: string; description?: string; order?: number }
  const item = await prisma.module.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.order !== undefined && { order: body.order }),
    },
    include: { lessons: { orderBy: { order: 'asc' } } },
  })
  return { module: item }
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  if (!await userCanAccessModule(request.user!.userId, id)) return reply.status(404).send({ error: 'Not found' })
  await prisma.module.delete({ where: { id } })
  return { success: true }
}
