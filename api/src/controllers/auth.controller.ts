import { FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcrypt'
import { prisma } from '../db'
import { signToken } from '../helpers/token'

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const { email, password } = request.body as { email: string; password: string }

  if (!email || !password) {
    return reply.status(400).send({ error: 'Email and password are required' })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.password) {
    return reply.status(401).send({ error: 'Invalid credentials' })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return reply.status(401).send({ error: 'Invalid credentials' })
  }

  const token = signToken({ userId: user.id, email: user.email })

  reply.setCookie('token', token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
  })

  return {
    user: { id: user.id, email: user.email, name: user.name },
  }
}

export async function logout(_request: FastifyRequest, reply: FastifyReply) {
  reply.clearCookie('token', { path: '/' })
  return { success: true }
}

export async function me(request: FastifyRequest, _reply: FastifyReply) {
  const user = await prisma.user.findUnique({
    where: { id: request.user!.userId },
    select: { id: true, email: true, name: true, roles: { include: { role: true } } },
  })
  return { user }
}
