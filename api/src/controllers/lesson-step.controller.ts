import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

export async function listByLesson(request: FastifyRequest, reply: FastifyReply) {
  const { lessonId } = request.params as { lessonId: string }
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, module: { course: { users: { some: { userId: request.user!.userId } } } } },
  })
  if (!lesson) return reply.status(404).send({ error: 'Not found' })

  const steps = await prisma.lessonStep.findMany({ where: { lessonId }, orderBy: { order: 'asc' } })
  return { steps }
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const { lessonId } = request.params as { lessonId: string }
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, module: { course: { users: { some: { userId: request.user!.userId } } } } },
  })
  if (!lesson) return reply.status(404).send({ error: 'Not found' })

  const max = await prisma.lessonStep.findFirst({ where: { lessonId }, orderBy: { order: 'desc' }, select: { order: true } })
  const item = await prisma.lessonStep.create({
    data: { lessonId, order: (max?.order ?? -1) + 1 },
  })
  return { step: item }
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const step = await prisma.lessonStep.findFirst({
    where: { id, lesson: { module: { course: { users: { some: { userId: request.user!.userId } } } } } },
  })
  if (!step) return reply.status(404).send({ error: 'Not found' })

  const body = request.body as { title?: string; slideType?: string; slideContent?: string | null; assistantText?: string | null; order?: number }
  const item = await prisma.lessonStep.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.slideType !== undefined && { slideType: body.slideType }),
      ...(body.slideContent !== undefined && { slideContent: body.slideContent }),
      ...(body.assistantText !== undefined && { assistantText: body.assistantText }),
      ...(body.order !== undefined && { order: body.order }),
    },
  })
  return { step: item }
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const step = await prisma.lessonStep.findFirst({
    where: { id, lesson: { module: { course: { users: { some: { userId: request.user!.userId } } } } } },
  })
  if (!step) return reply.status(404).send({ error: 'Not found' })

  await prisma.lessonStep.delete({ where: { id } })
  return { success: true }
}

export async function reorder(request: FastifyRequest, reply: FastifyReply) {
  const { lessonId } = request.params as { lessonId: string }
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, module: { course: { users: { some: { userId: request.user!.userId } } } } },
  })
  if (!lesson) return reply.status(404).send({ error: 'Not found' })

  const body = request.body as { ids: string[] }
  await Promise.all(
    body.ids.map((id, index) =>
      prisma.lessonStep.update({ where: { id }, data: { order: index } })
    )
  )
  return { success: true }
}
