import { FastifyRequest, FastifyReply } from 'fastify'
import path from 'path'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads')

export async function uploadFile(request: FastifyRequest, reply: FastifyReply) {
  const file = await request.file()
  if (!file) return reply.status(400).send({ error: 'No file uploaded' })

  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return reply.status(400).send({ error: 'File type not allowed. Allowed: JPEG, PNG, GIF, WebP, PDF' })
  }

  const ext = file.filename.split('.').pop() || 'bin'
  const filename = `${randomUUID()}.${ext}`
  const filepath = path.join(UPLOAD_DIR, filename)

  const chunks: Buffer[] = []
  for await (const chunk of file.file) {
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)

  await Bun.write(filepath, buffer)

  return { url: `/api/uploads/${filename}`, filename }
}
