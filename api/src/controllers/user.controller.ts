import { FastifyRequest } from 'fastify'
import { prisma } from '../db'

export async function list(request: FastifyRequest) {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, active: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return { users }
}
