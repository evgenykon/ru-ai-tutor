import fs from 'fs'
import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'
import {
  listCourseTtsCache,
  deleteTtsCacheEntry,
  setTtsCacheProtected,
  getCacheFilePath,
} from '../services/tts.service'

async function assertCourseAccess(request: FastifyRequest, courseId: string) {
  const isAdmin = request.user!.email === 'admin@admin.com'
  if (isAdmin) return
  const hasAccess = await prisma.course.findFirst({
    where: { id: courseId, users: { some: { userId: request.user!.userId } } },
  })
  if (!hasAccess) {
    throw new Error('Not found')
  }
}

export async function getCourseTtsCache(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string }
  try {
    await assertCourseAccess(request, id)
    const items = await listCourseTtsCache(id)
    return { items }
  } catch (e: any) {
    return reply.status(e.message === 'Not found' ? 404 : 500).send({ error: e.message || 'Failed to list cache' })
  }
}

export async function removeCourseTtsCacheEntry(request: FastifyRequest, reply: FastifyReply) {
  const { id, cacheId } = request.params as { id: string; cacheId: string }
  try {
    await assertCourseAccess(request, id)
    const item = await prisma.ttsCache.findFirst({ where: { id: cacheId, courseId: id } })
    if (!item) return reply.status(404).send({ error: 'Cache entry not found' })
    await deleteTtsCacheEntry(cacheId)
    return { success: true }
  } catch (e: any) {
    if (e.message === 'Protected cache entry cannot be deleted') {
      return reply.status(403).send({ error: e.message })
    }
    return reply.status(500).send({ error: e.message || 'Failed to delete cache entry' })
  }
}

export async function updateCourseTtsCacheProtected(request: FastifyRequest, reply: FastifyReply) {
  const { id, cacheId } = request.params as { id: string; cacheId: string }
  const body = request.body as { protected?: boolean }
  if (typeof body.protected !== 'boolean') {
    return reply.status(400).send({ error: 'protected is required' })
  }

  try {
    await assertCourseAccess(request, id)
    const item = await prisma.ttsCache.findFirst({ where: { id: cacheId, courseId: id } })
    if (!item) return reply.status(404).send({ error: 'Cache entry not found' })
    await setTtsCacheProtected(cacheId, body.protected)
    return { success: true }
  } catch (e: any) {
    return reply.status(500).send({ error: e.message || 'Failed to update cache entry' })
  }
}

export async function getCourseTtsCacheFile(request: FastifyRequest, reply: FastifyReply) {
  const { id, cacheId } = request.params as { id: string; cacheId: string }
  try {
    await assertCourseAccess(request, id)
    const item = await prisma.ttsCache.findFirst({ where: { id: cacheId, courseId: id } })
    if (!item) return reply.status(404).send({ error: 'Cache entry not found' })

    const filePath = getCacheFilePath(id, item.hash)
    try {
      await fs.promises.access(filePath)
    } catch {
      return reply.status(404).send({ error: 'File not found' })
    }

    reply.header('Content-Type', 'audio/ogg')
    return reply.send(fs.createReadStream(filePath))
  } catch (e: any) {
    return reply.status(500).send({ error: e.message || 'Failed to serve cache file' })
  }
}
