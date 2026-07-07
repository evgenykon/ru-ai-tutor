<template>
  <div>
    <h1>Пользователи</h1>

    <table v-if="users.length">
      <thead>
        <tr>
          <th>Email</th>
          <th>Имя</th>
          <th>Статус</th>
          <th>Создан</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.email }}</td>
          <td>{{ user.name || '—' }}</td>
          <td>{{ user.active ? 'Активен' : 'Отключён' }}</td>
          <td>{{ new Date(user.createdAt).toLocaleDateString() }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { $api } = useNuxtApp()
const { data } = await $api.get('/users')
const users = ref(data.users)
</script>

<style scoped>
h1 {
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

th, td {
  text-align: left;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  border-bottom: 1px solid #e5e7eb;
}

th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

td {
  color: #4b5563;
}
</style>
