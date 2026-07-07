<template>
  <div style="display: flex; height: 100vh;">
    <div style="width: 240px; background: #1e293b; color: white; display: flex; flex-direction: column;">
      <div style="padding: 1rem; border-bottom: 1px solid #334155;">
        <span style="font-weight: 600;">ru-ai-tutor</span>
      </div>

      <nav style="flex: 1; padding: 0.5rem; display: flex; flex-direction: column; gap: 2px;">
        <NuxtLink to="/" style="display: block; padding: 0.5rem 0.75rem; color: #94a3b8; text-decoration: none; border-radius: 4px; font-size: 0.875rem;">Дашборд</NuxtLink>
        <NuxtLink to="/users" style="display: block; padding: 0.5rem 0.75rem; color: #94a3b8; text-decoration: none; border-radius: 4px; font-size: 0.875rem;">Пользователи</NuxtLink>
      </nav>

      <div style="padding: 1rem; border-top: 1px solid #334155;">
        <button style="padding: 0.375rem 0.75rem; background: #475569; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem;" @click="logout">Выйти</button>
      </div>
    </div>

    <main style="flex: 1; padding: 1.5rem; background: #f1f5f9; overflow-y: auto;">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const store = useAuthStore()

async function logout() {
  await store.logout()
}
</script>
