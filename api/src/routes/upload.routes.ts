import { FastifyInstance } from 'fastify'
import { uploadFile } from '../controllers/upload.controller'
import { requireAuth } from '../middleware/require-auth'

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/upload', { preHandler: [requireAuth] }, uploadFile)
}
