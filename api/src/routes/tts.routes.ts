import { FastifyInstance } from 'fastify'
import { ttsSynthesize } from '../controllers/tts.controller'
import { requireAuth } from '../middleware/require-auth'

export async function ttsRoutes(app: FastifyInstance) {
  app.post('/tts/synthesize', { preHandler: [requireAuth] }, ttsSynthesize)
}
