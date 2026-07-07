import { FastifyInstance } from 'fastify'
import { list, getById, create, update, remove, checkSlug } from '../controllers/course.controller'
import { requireAuth } from '../middleware/require-auth'

export async function courseRoutes(app: FastifyInstance) {
  app.get('/courses', { preHandler: [requireAuth] }, list)
  app.get('/courses/check-slug', { preHandler: [requireAuth] }, checkSlug)
  app.get('/courses/:id', { preHandler: [requireAuth] }, getById)
  app.post('/courses', { preHandler: [requireAuth] }, create)
  app.put('/courses/:id', { preHandler: [requireAuth] }, update)
  app.delete('/courses/:id', { preHandler: [requireAuth] }, remove)
}
