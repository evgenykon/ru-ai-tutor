import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

const select = { id: true, service: true, keyValue: true, folderId: true, updatedAt: true }

export async function list() {
  const creds = await prisma.serviceCredential.findMany({ select, orderBy: { service: 'asc' } })
  return { credentials: creds }
}

export async function upsert(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { service: string; keyValue: string; folderId?: string | null }
  if (!body.service || !body.keyValue) return reply.status(400).send({ error: 'service and keyValue are required' })

  const data: any = { keyValue: body.keyValue }
  if (body.folderId !== undefined) data.folderId = body.folderId

  const cred = await prisma.serviceCredential.upsert({
    where: { service: body.service },
    update: data,
    create: { service: body.service, ...data },
    select,
  })

  return { credential: cred }
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { service } = request.params as { service: string }
  try {
    await prisma.serviceCredential.delete({ where: { service } })
  } catch {
    return reply.status(404).send({ error: 'Not found' })
  }
  return { success: true }
}

export async function getByService(request: FastifyRequest, reply: FastifyReply) {
  const { service } = request.params as { service: string }
  const cred = await prisma.serviceCredential.findUnique({ where: { service }, select })
  if (!cred) return reply.status(404).send({ error: 'Not found' })
  return { credential: cred }
}
