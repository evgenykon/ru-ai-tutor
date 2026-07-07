import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken, TokenPayload } from '../helpers/token'

declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies?.token

  if (!token) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return reply.status(401).send({ error: 'Invalid or expired token' })
  }

  request.user = payload
}
