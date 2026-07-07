import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { authRoutes } from './routes/auth.routes'
import { userRoutes } from './routes/user.routes'
import { apiKeyRoutes } from './routes/api-key.routes'
import { credentialRoutes } from './routes/credential.routes'
import { usageRoutes } from './routes/usage.routes'
import { assistantRoutes } from './routes/assistant.routes'
import { courseRoutes } from './routes/course.routes'
import { moduleRoutes } from './routes/module.routes'
import { lessonRoutes } from './routes/lesson.routes'
import { yandexOAuthRoutes } from './routes/yandex-oauth.routes'
import { avatarRoutes } from './routes/avatar.routes'
import { yandexModelsRoutes } from './routes/yandex-models.routes'
import { ttsRoutes } from './routes/tts.routes'

const app = Fastify({ logger: true })

app.register(cookie)

app.get('/health', async () => ({ status: 'ok' }))

app.register(authRoutes)
app.register(userRoutes)
app.register(apiKeyRoutes)
app.register(credentialRoutes)
app.register(usageRoutes)
app.register(assistantRoutes)
app.register(courseRoutes)
app.register(moduleRoutes)
app.register(lessonRoutes)
app.register(yandexOAuthRoutes)
app.register(avatarRoutes)
app.register(yandexModelsRoutes)
app.register(ttsRoutes)

async function start() {
  try {
    await app.listen({ port: 3001, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()

export default app
