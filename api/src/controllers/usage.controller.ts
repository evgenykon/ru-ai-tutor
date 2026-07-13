import { FastifyRequest } from 'fastify'
import { prisma } from '../db'

export async function list(request: FastifyRequest) {
  const query = request.query as {
    service?: string
    page?: string
    limit?: string
  }

  const page = Math.max(1, parseInt(query.page || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50')))

  const where: any = {}
  if (query.service) where.service = query.service

  const [items, total] = await Promise.all([
    prisma.usageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.usageLog.count({ where }),
  ])

  return { items, total, page, limit }
}
