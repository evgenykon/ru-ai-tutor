import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const { courseId } = request.params as { courseId: string }
  const course = await prisma.course.findFirst({
    where: { id: courseId, active: true, archived: false, users: { some: { userId: request.user!.userId } } },
  })
  if (!course) return reply.status(404).send({ error: 'Курс не найден или не опубликован' })
  if (!course.assistantId) return reply.status(400).send({ error: 'У курса не назначен ассистент' })

  const item = await prisma.session.create({
    data: { courseId, userId: request.user!.userId },
    include: {
      course: {
        include: {
          modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
          assistant: true,
        },
      },
    },
  })
  return { session: item }
}

export async function getById(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const item = await prisma.session.findFirst({
    where: { id, userId: request.user!.userId },
    include: {
      course: {
        include: {
          modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
          assistant: true,
        },
      },
    },
  })
  if (!item) return reply.status(404).send({ error: 'Сессия не найдена' })
  return { session: item }
}

export async function list(request: FastifyRequest) {
  const items = await prisma.session.findMany({
    where: { userId: request.user!.userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      course: {
        select: { id: true, name: true },
      },
    },
  })
  return { sessions: items }
}

export async function updateProgress(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const { progress } = request.body as { progress: Record<string, unknown> }

  const item = await prisma.session.findFirst({
    where: { id, userId: request.user!.userId },
  })
  if (!item) return reply.status(404).send({ error: 'Сессия не найдена' })

  const updated = await prisma.session.update({
    where: { id },
    data: { progress },
    include: {
      course: {
        select: { id: true, name: true },
      },
    },
  })
  return { session: updated }
}
