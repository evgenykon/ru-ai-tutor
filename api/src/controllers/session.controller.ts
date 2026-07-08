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
