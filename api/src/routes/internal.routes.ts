import { FastifyInstance } from 'fastify'
import { synthesize } from '../controllers/tts.controller'
import { chat, chatStream } from '../controllers/llm.controller'

export async function internalRoutes(app: FastifyInstance) {
  app.post('/internal/tts/synthesize', synthesize)
  app.post('/internal/llm/chat', chat)
  app.post('/internal/llm/chat-stream', chatStream)
}
