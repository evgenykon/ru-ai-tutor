import { FastifyInstance } from 'fastify'
import { ttsSynthesize, ttsCacheCommit } from '../controllers/tts.controller'
import { chat, chatStream } from '../controllers/llm.controller'

export async function internalRoutes(app: FastifyInstance) {
  app.post('/internal/tts/synthesize', ttsSynthesize)
  app.post('/internal/tts/cache/commit', ttsCacheCommit)
  app.post('/internal/llm/chat', chat)
  app.post('/internal/llm/chat-stream', chatStream)
}
