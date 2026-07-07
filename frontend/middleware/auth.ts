export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const store = useAuthStore()

  if (store.loading) {
    await store.fetchUser()
  }

  if (!store.user) {
    return navigateTo('/login')
  }
})
