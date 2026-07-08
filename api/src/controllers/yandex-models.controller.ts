import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db'

const voices = [
  { id: 'alena', name: 'Алёна', gender: 'female', lang: 'ru-RU' },
  { id: 'filipp', name: 'Филипп', gender: 'male', lang: 'ru-RU' },
  { id: 'ermil', name: 'Эрмиль', gender: 'male', lang: 'ru-RU' },
  { id: 'jane', name: 'Джейн', gender: 'female', lang: 'ru-RU' },
  { id: 'omazh', name: 'Омаж', gender: 'female', lang: 'ru-RU' },
  { id: 'zahar', name: 'Захар', gender: 'male', lang: 'ru-RU' },
  { id: 'dasha', name: 'Даша', gender: 'female', lang: 'ru-RU' },
  { id: 'julia', name: 'Юлия', gender: 'female', lang: 'ru-RU' },
  { id: 'lera', name: 'Лера', gender: 'female', lang: 'ru-RU' },
  { id: 'masha', name: 'Маша', gender: 'female', lang: 'ru-RU' },
  { id: 'marina', name: 'Марина', gender: 'female', lang: 'ru-RU' },
  { id: 'alexander', name: 'Александр', gender: 'male', lang: 'ru-RU' },
  { id: 'kirill', name: 'Кирилл', gender: 'male', lang: 'ru-RU' },
  { id: 'anton', name: 'Антон', gender: 'male', lang: 'ru-RU' },
  { id: 'madi_ru', name: 'Мади (рус)', gender: 'male', lang: 'ru-RU' },
  { id: 'saule_ru', name: 'Сауле (рус)', gender: 'female', lang: 'ru-RU' },
  { id: 'zamira_ru', name: 'Замира (рус)', gender: 'female', lang: 'ru-RU' },
  { id: 'zhanar_ru', name: 'Жанар (рус)', gender: 'female', lang: 'ru-RU' },
  { id: 'yulduz_ru', name: 'Юлдуз (рус)', gender: 'female', lang: 'ru-RU' },
]

export async function listYandexModels(request: FastifyRequest, _reply: FastifyReply) {
  const query = request.query as { type?: string }

  const cred = query.type === 'tts'
    ? await prisma.serviceCredential.findUnique({ where: { service: 'yandex' } })
    : await prisma.serviceCredential.findFirst({ where: { service: { in: ['yandex-ai', 'yandex'] } } })

  if (!cred?.keyValue) return { models: [] }

  const headers: Record<string, string> = {
    Authorization: `Api-Key ${cred.keyValue}`,
  }
  if (cred.folderId) headers['x-folder-id'] = cred.folderId

  try {
    const res = await fetch('https://ai.api.cloud.yandex.net/v1/models', { headers })
    if (!res.ok) return { models: [] }
    const json = await res.json() as { data: { id: string; owned_by?: string }[] }
    const all = json.data as { id: string }[]
    const filtered = all.filter(m => {
      const clean = m.id.replace(/^[a-z]+:\/\/[^/]+\//, '').replace(/^[a-z]+:\/\//, '')
      if (query.type === 'tts') return clean.startsWith('speech-realtime')
      return !clean.startsWith('speech-realtime') && !clean.startsWith('art://') && !clean.startsWith('img://')
    })
    return { models: filtered.map(m => {
      const clean = m.id.replace(/^[a-z]+:\/\/[^/]+\//, '').replace(/^[a-z]+:\/\//, '')
      return { id: m.id, name: clean, service: 'yandex-ai' }
    }) }
  } catch {
    return { models: [] }
  }
}

export async function listVoices() {
  return { voices }
}
