import { FastifyInstance } from 'fastify'
import { list, upsert, getByService, remove } from '../controllers/credential.controller'
import { requireAuth } from '../middleware/require-auth'

export async function credentialRoutes(app: FastifyInstance) {
  app.get('/credentials', { preHandler: [requireAuth] }, list)
  app.get('/credentials/:service', { preHandler: [requireAuth] }, getByService)
  app.put('/credentials', { preHandler: [requireAuth] }, upsert)
  app.delete('/credentials/:service', { preHandler: [requireAuth] }, remove)
}
