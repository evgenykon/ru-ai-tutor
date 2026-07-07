import { FastifyInstance } from 'fastify'
import { register, login, logout, me } from '../controllers/auth.controller'
import { requireAuth } from '../middleware/require-auth'

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', register)
  app.post('/auth/login', login)
  app.post('/auth/logout', logout)
  app.get('/auth/me', { preHandler: [requireAuth] }, me)
}
