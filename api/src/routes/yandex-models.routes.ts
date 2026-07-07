import { FastifyInstance } from 'fastify'
import { listYandexModels, listVoices } from '../controllers/yandex-models.controller'
import { requireAuth } from '../middleware/require-auth'

export async function yandexModelsRoutes(app: FastifyInstance) {
  app.get('/yandex-models', { preHandler: [requireAuth] }, listYandexModels)
  app.get('/yandex-voices', { preHandler: [requireAuth] }, listVoices)
}
