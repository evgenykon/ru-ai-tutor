import { FastifyRequest, FastifyReply } from 'fastify'
import crypto from 'crypto'
import { prisma } from '../db'

export async function list() {
  const keys = await prisma.apiKey.findMany({
    select: { id: true, name: true, prefix: true, active: true, expiresAt: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return { keys }
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const { name } = request.body as { name: string }
  if (!name) return reply.status(400).send({ error: 'Name is required' })

  const raw = crypto.randomBytes(32).toString('hex')
  const prefix = raw.slice(0, 8)
  const hash = crypto.createHash('sha256').update(raw).digest('hex')

  const key = await prisma.apiKey.create({
    data: { name, prefix, keyHash: hash },
    select: { id: true, name: true, prefix: true, active: true, createdAt: true },
  })

  return { key, token: raw }
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  const existing = await prisma.apiKey.findUnique({ where: { id } })
  if (!existing) return reply.status(404).send({ error: 'Not found' })

  await prisma.apiKey.delete({ where: { id } })
  return { success: true }
}
