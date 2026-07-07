import { FastifyInstance } from 'fastify'
import { listAvatars } from '../controllers/avatar.controller'

export async function avatarRoutes(app: FastifyInstance) {
  app.get('/avatars', listAvatars)
}
