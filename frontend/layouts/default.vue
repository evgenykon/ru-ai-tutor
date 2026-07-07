<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="logo">ru-ai-tutor</span>
      </div>

      <nav class="nav">
        <NuxtLink to="/" class="nav-link">Дашборд</NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <span class="user-email">{{ store.user?.email }}</span>
        <button class="logout-btn" @click="store.logout()">Выйти</button>
      </div>
    </aside>

    <main class="main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const store = useAuthStore()
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 240px;
  background: #1e293b;
  color: white;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid #334155;
}

.logo {
  font-weight: 600;
  font-size: 1rem;
}

.nav {
  flex: 1;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-link {
  display: block;
  padding: 0.5rem 0.75rem;
  color: #94a3b8;
  text-decoration: none;
  border-radius: 4px;
  font-size: 0.875rem;
}

.nav-link:hover,
.nav-link.router-link-active {
  background: #334155;
  color: white;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid #334155;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-email {
  font-size: 0.75rem;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  padding: 0.375rem 0.75rem;
  background: #475569;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

.main {
  flex: 1;
  padding: 1.5rem;
  background: #f1f5f9;
  overflow-y: auto;
}
</style>
