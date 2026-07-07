import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { authRoutes } from './routes/auth.routes'

const app = Fastify({ logger: true })

app.register(cookie)

app.get('/health', async () => ({ status: 'ok' }))

app.register(authRoutes)

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
