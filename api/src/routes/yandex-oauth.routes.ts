import { FastifyInstance } from 'fastify'
import { yandexAuth, yandexCallback } from '../controllers/yandex-oauth.controller'

export async function yandexOAuthRoutes(app: FastifyInstance) {
  app.get('/auth/yandex', yandexAuth)
  app.get('/auth/yandex/callback', yandexCallback)
}
