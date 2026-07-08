import { FastifyInstance } from 'fastify'
import { create, getById } from '../controllers/session.controller'
import { requireAuth } from '../middleware/require-auth'

export async function sessionRoutes(app: FastifyInstance) {
  app.post('/courses/:courseId/sessions', { preHandler: [requireAuth] }, create)
  app.get('/sessions/:id', { preHandler: [requireAuth] }, getById)
}
