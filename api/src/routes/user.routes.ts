import { FastifyInstance } from 'fastify'
import { list } from '../controllers/user.controller'
import { requireAuth } from '../middleware/require-auth'

export async function userRoutes(app: FastifyInstance) {
  app.get('/users', { preHandler: [requireAuth] }, list)
}
