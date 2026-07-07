import { FastifyInstance } from 'fastify'
import { list, create, remove } from '../controllers/api-key.controller'
import { requireAuth } from '../middleware/require-auth'

export async function apiKeyRoutes(app: FastifyInstance) {
  app.get('/api-keys', { preHandler: [requireAuth] }, list)
  app.post('/api-keys', { preHandler: [requireAuth] }, create)
  app.delete('/api-keys/:id', { preHandler: [requireAuth] }, remove)
}
