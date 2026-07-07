import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

export async function list() {
  const creds = await prisma.serviceCredential.findMany({
    select: { id: true, service: true, keyValue: true, updatedAt: true },
    orderBy: { service: 'asc' },
  })
  return { credentials: creds }
}

export async function upsert(request: FastifyRequest, reply: FastifyReply) {
  const { service, keyValue } = request.body as { service: string; keyValue: string }
  if (!service || !keyValue) return reply.status(400).send({ error: 'service and keyValue are required' })

  const cred = await prisma.serviceCredential.upsert({
    where: { service },
    update: { keyValue },
    create: { service, keyValue },
    select: { id: true, service: true, updatedAt: true },
  })

  return { credential: cred }
}

export async function getByService(request: FastifyRequest, reply: FastifyReply) {
  const { service } = request.params as { service: string }
  const cred = await prisma.serviceCredential.findUnique({
    where: { service },
    select: { id: true, service: true, keyValue: true, updatedAt: true },
  })

  if (!cred) return reply.status(404).send({ error: 'Not found' })
  return { credential: cred }
}
