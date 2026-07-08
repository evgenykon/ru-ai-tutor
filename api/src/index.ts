import path from 'path'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { authRoutes } from './routes/auth.routes'
import { userRoutes } from './routes/user.routes'
import { apiKeyRoutes } from './routes/api-key.routes'
import { credentialRoutes } from './routes/credential.routes'
import { usageRoutes } from './routes/usage.routes'
import { assistantRoutes } from './routes/assistant.routes'
import { courseRoutes } from './routes/course.routes'
import { moduleRoutes } from './routes/module.routes'
import { lessonRoutes } from './routes/lesson.routes'
import { lessonStepRoutes } from './routes/lesson-step.routes'
import { sessionRoutes } from './routes/session.routes'
import { yandexOAuthRoutes } from './routes/yandex-oauth.routes'
import { avatarRoutes } from './routes/avatar.routes'
import { yandexModelsRoutes } from './routes/yandex-models.routes'
import { uploadRoutes } from './routes/upload.routes'
import { ttsRoutes } from './routes/tts.routes'
import { internalRoutes } from './routes/internal.routes'

const app = Fastify({ logger: true })

app.register(cookie)
app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } })

const uploadsDir = path.join(__dirname, '..', 'uploads')
app.register(fastifyStatic, { root: uploadsDir, prefix: '/uploads/', decorateReply: false })

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
app.register(lessonStepRoutes)
app.register(sessionRoutes)
app.register(yandexOAuthRoutes)
app.register(avatarRoutes)
app.register(yandexModelsRoutes)
app.register(ttsRoutes)
app.register(uploadRoutes)
app.register(internalRoutes)

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
