import { FastifyInstance } from 'fastify'
import { listByLesson, create, update, remove, reorder } from '../controllers/lesson-step.controller'
import { requireAuth } from '../middleware/require-auth'

export async function lessonStepRoutes(app: FastifyInstance) {
  app.get('/lessons/:lessonId/steps', { preHandler: [requireAuth] }, listByLesson)
  app.post('/lessons/:lessonId/steps', { preHandler: [requireAuth] }, create)
  app.put('/lessons/:lessonId/steps/reorder', { preHandler: [requireAuth] }, reorder)
  app.put('/steps/:id', { preHandler: [requireAuth] }, update)
  app.delete('/steps/:id', { preHandler: [requireAuth] }, remove)
}
