import { FastifyInstance } from 'fastify'
import { synthesize } from '../controllers/tts.controller'

export async function internalRoutes(app: FastifyInstance) {
  app.post('/internal/tts/synthesize', synthesize)
}
