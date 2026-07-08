import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

async function userCanAccessModule(userId: string, moduleId: string) {
  const mod = await prisma.module.findFirst({ where: { id: moduleId, course: { users: { some: { userId } } } } })
  return !!mod
}

async function userCanAccessLesson(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, module: { course: { users: { some: { userId } } } } } })
  return !!lesson
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const { moduleId } = request.params as { moduleId: string }
  if (!await userCanAccessModule(request.user!.userId, moduleId)) return reply.status(404).send({ error: 'Not found' })
  const body = request.body as { title: string; content?: string; order?: number }
  if (!body.title) return reply.status(400).send({ error: 'title is required' })
  const item = await prisma.lesson.create({
    data: { moduleId, title: body.title, content: body.content ?? null, order: body.order ?? 0 },
  })
  return { lesson: item }
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  if (!await userCanAccessLesson(request.user!.userId, id)) return reply.status(404).send({ error: 'Not found' })
  const body = request.body as { title?: string; content?: string; order?: number }
  const item = await prisma.lesson.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.order !== undefined && { order: body.order }),
    },
  })
  return { lesson: item }
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  if (!await userCanAccessLesson(request.user!.userId, id)) return reply.status(404).send({ error: 'Not found' })
  await prisma.lesson.delete({ where: { id } })
  return { success: true }
}
