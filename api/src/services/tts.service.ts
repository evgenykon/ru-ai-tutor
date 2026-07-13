import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { prisma } from '../db'

const CACHE_DIR = path.join(__dirname, '..', '..', 'uploads', 'voices')
const TEMP_CACHE_DIR = path.join(CACHE_DIR, '_temp')

interface SynthesizeParams {
  courseId?: string
  model: string
  voice: string
  speed: number
  text: string
  cache?: boolean
}

interface SynthesizeResult {
  buffer: Buffer
  cached: boolean
  hash?: string
}

interface PendingResult extends SynthesizeResult {
  saved: boolean
}

export interface TtsCacheItem {
  id: string
  courseId: string
  hash: string
  model: string
  voice: string
  speed: number
  text: string
  filePath: string
  fileSize: number
  hitCount: number
  protected: boolean
  lastHitAt: Date
  createdAt: Date
  updatedAt: Date
}

const pending = new Map<string, Promise<PendingResult>>()
const tempCache = new Map<string, { path: string; params: SynthesizeParams; timer: NodeJS.Timeout }>()

const TEMP_CACHE_TTL_MS = 5 * 60 * 1000

export function getCacheHash(courseId: string, model: string, voice: string, speed: number, text: string): string {
  const payload = { courseId, model, voice, speed, text }
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export function getCacheFilePath(courseId: string, hash: string): string {
  return path.join(CACHE_DIR, courseId, `${hash}.ogg`)
}

function getCacheKey(courseId: string, hash: string): string {
  return `${courseId}:${hash}`
}

async function fetchTtsAudio(params: SynthesizeParams): Promise<Buffer> {
  const cred = await prisma.serviceCredential.findUnique({ where: { service: 'yandex' } })
  if (!cred?.keyValue) {
    throw new Error('TTS key not configured')
  }

  const headers: Record<string, string> = {
    Authorization: `Api-Key ${cred.keyValue}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  if (cred.folderId) headers['x-folder-id'] = cred.folderId

  const body = new URLSearchParams({
    text: params.text,
    voice: params.voice,
    format: 'oggopus',
    speed: String(params.speed ?? 1),
  })

  const res = await fetch('https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize', {
    method: 'POST',
    headers,
    body,
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`TTS failed: ${res.status} ${err.slice(0, 200)}`)
  }

  return Buffer.from(await res.arrayBuffer())
}

async function saveAudioToCache(params: SynthesizeParams, buffer: Buffer, hash: string): Promise<void> {
  const courseDir = path.join(CACHE_DIR, params.courseId!)
  await fs.promises.mkdir(courseDir, { recursive: true })
  await fs.promises.writeFile(getCacheFilePath(params.courseId!, hash), buffer)

  const filePath = `${hash}.ogg`
  const fileSize = buffer.byteLength
  await prisma.ttsCache.upsert({
    where: { courseId_hash: { courseId: params.courseId!, hash } },
    create: {
      courseId: params.courseId!,
      hash,
      model: params.model,
      voice: params.voice,
      speed: params.speed,
      text: params.text,
      filePath,
      fileSize,
    },
    update: {
      model: params.model,
      voice: params.voice,
      speed: params.speed,
      text: params.text,
      filePath,
      fileSize,
      protected: false,
      hitCount: 0,
      lastHitAt: new Date(),
    },
  })
}

async function writeTempCacheFile(params: SynthesizeParams, hash: string, buffer: Buffer): Promise<void> {
  const tempDir = path.join(TEMP_CACHE_DIR, params.courseId!)
  await fs.promises.mkdir(tempDir, { recursive: true })
  const tempPath = path.join(tempDir, `${hash}.ogg`)
  await fs.promises.writeFile(tempPath, buffer)

  const key = getCacheKey(params.courseId!, hash)
  const existing = tempCache.get(key)
  if (existing) {
    clearTimeout(existing.timer)
    try {
      await fs.promises.rm(existing.path, { force: true })
    } catch { /* ignore */ }
  }

  const timer = setTimeout(() => {
    tempCache.delete(key)
    fs.promises.rm(tempPath, { force: true }).catch(() => {})
  }, TEMP_CACHE_TTL_MS)
  tempCache.set(key, { path: tempPath, params, timer })
}

export async function commitTtsCache(courseId: string, hash: string): Promise<boolean> {
  const existing = await prisma.ttsCache.findUnique({
    where: { courseId_hash: { courseId, hash } },
  })
  if (existing) return true

  const key = getCacheKey(courseId, hash)
  const entry = tempCache.get(key)
  if (!entry) return false

  try {
    await fs.promises.access(entry.path)
  } catch {
    return false
  }

  const courseDir = path.join(CACHE_DIR, courseId)
  await fs.promises.mkdir(courseDir, { recursive: true })
  await fs.promises.rename(entry.path, getCacheFilePath(courseId, hash))
  clearTimeout(entry.timer)
  tempCache.delete(key)

  const finalPath = getCacheFilePath(courseId, hash)
  const fileSize = (await fs.promises.stat(finalPath)).size
  const filePath = `${hash}.ogg`
  const params = entry.params
  await prisma.ttsCache.upsert({
    where: { courseId_hash: { courseId, hash } },
    create: {
      courseId,
      hash,
      model: params.model,
      voice: params.voice,
      speed: params.speed,
      text: params.text,
      filePath,
      fileSize,
    },
    update: {
      model: params.model,
      voice: params.voice,
      speed: params.speed,
      text: params.text,
      filePath,
      fileSize,
      protected: false,
      hitCount: 0,
      lastHitAt: new Date(),
    },
  })

  return true
}

export async function synthesize(params: SynthesizeParams): Promise<SynthesizeResult> {
  if (!params.courseId) {
    const buffer = await fetchTtsAudio(params)
    return { buffer, cached: false }
  }

  if (!params.model) {
    throw new Error('model is required')
  }

  const hash = getCacheHash(params.courseId, params.model, params.voice, params.speed, params.text)
  const key = getCacheKey(params.courseId, hash)

  const existing = await prisma.ttsCache.findUnique({
    where: { courseId_hash: { courseId: params.courseId, hash } },
  })
  if (existing) {
    try {
      const buffer = await fs.promises.readFile(getCacheFilePath(params.courseId, hash))
      await prisma.ttsCache.update({
        where: { id: existing.id },
        data: { hitCount: { increment: 1 }, lastHitAt: new Date() },
      })
      return { buffer, cached: true, hash }
    } catch {
      // File missing or unreadable, regenerate below.
    }
  }

  const pendingPromise = pending.get(key)
  if (pendingPromise) {
    const result = await pendingPromise
    if (params.cache !== false && !result.saved && result.hash) {
      await saveAudioToCache(params, result.buffer, result.hash)
      return { buffer: result.buffer, cached: true, hash: result.hash }
    }
    const cached = result.saved || result.cached
    return { buffer: result.buffer, cached, hash: result.hash }
  }

  const promise = fetchTtsAudio(params).then(async (buffer): Promise<PendingResult> => {
    if (params.cache === false) {
      await writeTempCacheFile(params, hash, buffer)
      return { buffer, cached: false, hash, saved: false }
    }
    await saveAudioToCache(params, buffer, hash)
    return { buffer, cached: false, hash, saved: true }
  }).finally(() => {
    pending.delete(key)
  })
  pending.set(key, promise)
  return promise
}

export async function listCourseTtsCache(courseId: string): Promise<TtsCacheItem[]> {
  return prisma.ttsCache.findMany({
    where: { courseId },
    orderBy: { lastHitAt: 'desc' },
  })
}

export async function deleteCourseTtsCache(courseId: string): Promise<void> {
  await prisma.ttsCache.deleteMany({ where: { courseId } })
  const courseDir = path.join(CACHE_DIR, courseId)
  await fs.promises.rm(courseDir, { recursive: true, force: true })
}

export async function deleteTtsCacheEntry(id: string): Promise<void> {
  const item = await prisma.ttsCache.findUnique({ where: { id } })
  if (!item) return
  if (item.protected) {
    throw new Error('Protected cache entry cannot be deleted')
  }
  await prisma.ttsCache.delete({ where: { id } })
  const filePath = path.join(CACHE_DIR, item.courseId, item.filePath)
  await fs.promises.rm(filePath, { force: true })
}

export async function setTtsCacheProtected(id: string, protectedValue: boolean): Promise<void> {
  await prisma.ttsCache.update({
    where: { id },
    data: { protected: protectedValue },
  })
}
