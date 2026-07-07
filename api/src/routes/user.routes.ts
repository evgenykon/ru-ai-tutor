import { FastifyInstance } from 'fastify'
import { list, getById, remove } from '../controllers/user.controller'
import { requireAuth } from '../middleware/require-auth'

export async function userRoutes(app: FastifyInstance) {
  app.get('/users', { preHandler: [requireAuth] }, list)
  app.get('/users/:id', { preHandler: [requireAuth] }, getById)
  app.delete('/users/:id', { preHandler: [requireAuth] }, remove)
}
