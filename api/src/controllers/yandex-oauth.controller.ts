import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'
import { signToken } from '../helpers/token'

export async function yandexAuth(_request: FastifyRequest, reply: FastifyReply) {
  const clientId = process.env.YANDEX_CLIENT_ID
  const redirectUri = process.env.YANDEX_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return reply.status(500).send({ error: 'Yandex OAuth not configured' })
  }
  const url = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`
  reply.redirect(url)
}

export async function yandexCallback(request: FastifyRequest, reply: FastifyReply) {
  const { code } = request.query as { code: string }
  const clientId = process.env.YANDEX_CLIENT_ID
  const clientSecret = process.env.YANDEX_CLIENT_SECRET
  const redirectUri = process.env.YANDEX_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri || !code) {
    return reply.status(400).send({ error: 'Invalid request' })
  }

  const tokenRes = await fetch('https://oauth.yandex.ru/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenRes.ok) {
    return reply.status(502).send({ error: 'Failed to get Yandex token' })
  }

  const tokenData = await tokenRes.json() as { access_token: string }

  const userRes = await fetch('https://login.yandex.ru/info', {
    headers: { Authorization: `OAuth ${tokenData.access_token}` },
  })

  if (!userRes.ok) {
    return reply.status(502).send({ error: 'Failed to get Yandex user info' })
  }

  const yandexUser = await userRes.json() as { id: string; default_email: string; display_name?: string; real_name?: string }

  const email = yandexUser.default_email
  let user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: yandexUser.display_name || yandexUser.real_name || email.split('@')[0],
        active: true,
      },
    })

  }

  const token = signToken({ userId: user.id, email: user.email })

  reply.setCookie('token', token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
  })

  reply.redirect('/')
}
