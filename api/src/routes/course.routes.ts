import { FastifyInstance } from 'fastify'
import { list, getById, create, update, remove, checkSlug } from '../controllers/course.controller'
import {
  getCourseTtsCache,
  getCourseTtsCacheFile,
  removeCourseTtsCacheEntry,
  updateCourseTtsCacheProtected,
} from '../controllers/tts-cache.controller'
import { requireAuth } from '../middleware/require-auth'

export async function courseRoutes(app: FastifyInstance) {
  app.get('/courses', { preHandler: [requireAuth] }, list)
  app.get('/courses/check-slug', { preHandler: [requireAuth] }, checkSlug)
  app.get('/courses/:id', { preHandler: [requireAuth] }, getById)
  app.post('/courses', { preHandler: [requireAuth] }, create)
  app.put('/courses/:id', { preHandler: [requireAuth] }, update)
  app.delete('/courses/:id', { preHandler: [requireAuth] }, remove)

  app.get('/courses/:id/tts-cache', { preHandler: [requireAuth] }, getCourseTtsCache)
  app.get('/courses/:id/tts-cache/:cacheId/file', { preHandler: [requireAuth] }, getCourseTtsCacheFile)
  app.delete('/courses/:id/tts-cache/:cacheId', { preHandler: [requireAuth] }, removeCourseTtsCacheEntry)
  app.patch('/courses/:id/tts-cache/:cacheId/protected', { preHandler: [requireAuth] }, updateCourseTtsCacheProtected)
}
