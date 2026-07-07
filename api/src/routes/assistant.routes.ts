import { FastifyInstance } from 'fastify'
import { list, getById, create, update, remove, models } from '../controllers/assistant.controller'
import { requireAuth } from '../middleware/require-auth'

export async function assistantRoutes(app: FastifyInstance) {
  app.get('/assistants/models', { preHandler: [requireAuth] }, models)
  app.get('/assistants', { preHandler: [requireAuth] }, list)
  app.get('/assistants/:id', { preHandler: [requireAuth] }, getById)
  app.post('/assistants', { preHandler: [requireAuth] }, create)
  app.put('/assistants/:id', { preHandler: [requireAuth] }, update)
  app.delete('/assistants/:id', { preHandler: [requireAuth] }, remove)
}
