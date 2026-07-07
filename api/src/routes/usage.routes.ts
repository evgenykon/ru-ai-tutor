import { FastifyInstance } from 'fastify'
import { list } from '../controllers/usage.controller'
import { requireAuth } from '../middleware/require-auth'

export async function usageRoutes(app: FastifyInstance) {
  app.get('/usage', { preHandler: [requireAuth] }, list)
}
