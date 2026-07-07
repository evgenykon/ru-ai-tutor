import { FastifyInstance } from 'fastify'
import { listByCourse, create, update, remove } from '../controllers/module.controller'
import { requireAuth } from '../middleware/require-auth'

export async function moduleRoutes(app: FastifyInstance) {
  app.get('/courses/:courseId/modules', { preHandler: [requireAuth] }, listByCourse)
  app.post('/courses/:courseId/modules', { preHandler: [requireAuth] }, create)
  app.put('/modules/:id', { preHandler: [requireAuth] }, update)
  app.delete('/modules/:id', { preHandler: [requireAuth] }, remove)
}
