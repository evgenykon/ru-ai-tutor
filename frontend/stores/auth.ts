import { defineStore } from 'pinia'

interface User {
  id: string
  email: string
  name: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(true)

  const { $api } = useNuxtApp()

  async function fetchUser() {
    try {
      const { data } = await $api.get('/auth/me')
      user.value = data.user
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string) {
    const { data } = await $api.post('/auth/login', { email, password })
    user.value = data.user
  }

  async function logout() {
    await $api.post('/auth/logout')
    user.value = null
    navigateTo('/login')
  }

  return { user, loading, fetchUser, login, logout }
})
