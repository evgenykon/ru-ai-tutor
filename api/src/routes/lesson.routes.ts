import { FastifyInstance } from 'fastify'
import { create, update, remove } from '../controllers/lesson.controller'
import { requireAuth } from '../middleware/require-auth'

export async function lessonRoutes(app: FastifyInstance) {
  app.post('/modules/:moduleId/lessons', { preHandler: [requireAuth] }, create)
  app.put('/lessons/:id', { preHandler: [requireAuth] }, update)
  app.delete('/lessons/:id', { preHandler: [requireAuth] }, remove)
}
