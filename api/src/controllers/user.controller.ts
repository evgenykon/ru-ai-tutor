import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

export async function list(request: FastifyRequest) {
  const isAdmin = request.user!.email === 'admin@admin.com'
  const where = isAdmin ? {} : { id: request.user!.userId }
  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true, active: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return { users }
}

export async function getById(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const isAdmin = request.user!.email === 'admin@admin.com'
  if (!isAdmin && id !== request.user!.userId) {
    return reply.status(403).send({ error: 'Forbidden' })
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, phone: true, active: true, createdAt: true },
  })
  if (!user) return reply.status(404).send({ error: 'Not found' })
  return { user }
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const isAdmin = request.user!.email === 'admin@admin.com'
  if (!isAdmin && id !== request.user!.userId) {
    return reply.status(403).send({ error: 'Forbidden' })
  }
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return reply.status(404).send({ error: 'Not found' })
  await prisma.user.delete({ where: { id } })
  return { success: true }
}
