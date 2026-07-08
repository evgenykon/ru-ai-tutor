import { FastifyInstance } from 'fastify'
import { create, getById, list, updateProgress } from '../controllers/session.controller'
import { requireAuth } from '../middleware/require-auth'

export async function sessionRoutes(app: FastifyInstance) {
  app.post('/courses/:courseId/sessions', { preHandler: [requireAuth] }, create)
  app.get('/sessions', { preHandler: [requireAuth] }, list)
  app.get('/sessions/:id', { preHandler: [requireAuth] }, getById)
  app.patch('/sessions/:id/progress', { preHandler: [requireAuth] }, updateProgress)
}
