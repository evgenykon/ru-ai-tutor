import axios from 'axios'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const api = axios.create({
    baseURL: `${config.public.baseUrl}/api`,
    withCredentials: true,
  })

  return { provide: { api } }
})
