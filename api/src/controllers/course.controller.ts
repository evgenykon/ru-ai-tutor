import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

export async function list(request: FastifyRequest) {
  const query = request.query as { page?: string; limit?: string; archived?: string; status?: string; q?: string }
  const page = Math.max(1, parseInt(query.page || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)))
  const skip = (page - 1) * limit
  const isAdmin = request.user!.email === 'admin@admin.com'

  let where: any = {}
  if (!isAdmin) {
    const userCourseIds = await prisma.userCourse.findMany({
      where: { userId: request.user!.userId },
      select: { courseId: true },
    }).then(r => r.map(uc => uc.courseId))
    if (!userCourseIds.length) return { courses: [], total: 0, page, limit }
    where.id = { in: userCourseIds }
  }

  if (query.archived === 'true') where.archived = true
  else if (query.archived === 'all') {}
  else where.archived = false

  if (query.status === 'published') where.active = true
  else if (query.status === 'draft') where.active = false

  if (query.q) where.name = { contains: query.q, mode: 'insensitive' }

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip, take: limit,
      include: { users: { include: { user: { select: { id: true, name: true, email: true } } } } },
    }),
    prisma.course.count({ where }),
  ])
  return { courses, total, page, limit }
}

export async function getById(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const isAdmin = request.user!.email === 'admin@admin.com'
  const where: any = { id }
  if (!isAdmin) where.users = { some: { userId: request.user!.userId } }
  const item = await prisma.course.findFirst({
    where,
    include: {
      modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
      assistant: true,
    },
  })
  if (!item) return reply.status(404).send({ error: 'Not found' })
  return { course: item }
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { name: string; slug?: string | null; description?: string; active?: boolean; assistantId?: string }
  if (!body.name) return reply.status(400).send({ error: 'name is required' })

  if (body.slug) {
    const conflict = await prisma.course.findUnique({ where: { slug: body.slug } })
    if (conflict) return reply.status(409).send({ error: 'slug already exists' })
  }

  const item = await prisma.course.create({
    data: {
      name: body.name,
      slug: body.slug ?? null,
      description: body.description ?? null,
      active: body.active ?? false,
      ...(body.assistantId !== undefined && { assistantId: body.assistantId }),
      users: { create: { userId: request.user!.userId } },
    },
  })
  return { course: item }
}

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const body = request.body as {
    name?: string; slug?: string | null; description?: string; active?: boolean;
    assistantId?: string | null; archived?: boolean
  }

  const isAdmin = request.user!.email === 'admin@admin.com'
  const existing = await prisma.course.findFirst({ where: { id, ...(isAdmin ? {} : { users: { some: { userId: request.user!.userId } } }) } })
  if (!existing) return reply.status(404).send({ error: 'Not found' })

  const effectiveActive = body.active !== undefined ? body.active : existing.active
  const effectiveSlug = body.slug !== undefined ? body.slug : existing.slug
  const effectiveAssistantId = body.assistantId !== undefined ? body.assistantId : existing.assistantId
  if (effectiveActive) {
    if (!effectiveSlug) return reply.status(400).send({ error: 'slug is required for publishing' })
    if (!effectiveAssistantId) return reply.status(400).send({ error: 'assistant is required for publishing' })
  }

  if (body.slug !== undefined && body.slug !== null) {
    const conflict = await prisma.course.findFirst({ where: { slug: body.slug, id: { not: id } } })
    if (conflict) return reply.status(409).send({ error: 'slug already exists' })
  }

  const item = await prisma.course.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.assistantId !== undefined && { assistantId: body.assistantId }),
      ...(body.archived !== undefined && { archived: body.archived }),
    },
    include: {
      modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
      assistant: true,
    },
  })
  return { course: item }
}

export async function checkSlug(request: FastifyRequest) {
  const query = request.query as { slug: string; id?: string }
  const conflict = await prisma.course.findFirst({ where: { slug: query.slug, ...(query.id ? { id: { not: query.id } } : {}) } })
  return { available: !conflict }
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const isAdmin = request.user!.email === 'admin@admin.com'
  const existing = await prisma.course.findFirst({ where: { id, ...(isAdmin ? {} : { users: { some: { userId: request.user!.userId } } }) } })
  if (!existing) return reply.status(404).send({ error: 'Not found' })
  await prisma.course.delete({ where: { id } })
  return { success: true }
}
