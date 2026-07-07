<template>
  <div class="login-page">
    <form @submit.prevent="handleRegister" class="login-form">
      <h1>Регистрация</h1>

      <input v-model="name" type="text" placeholder="Имя" />
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Пароль" required minlength="6" />

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="submitting">
        {{ submitting ? 'Регистрация...' : 'Зарегистрироваться' }}
      </button>

      <p class="link">
        Уже есть аккаунт? <NuxtLink to="/login">Войти</NuxtLink>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'guest' })

const { $api } = useNuxtApp()
const store = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function handleRegister() {
  error.value = ''
  submitting.value = true

  try {
    const { data } = await $api.post('/auth/register', { email: email.value, password: password.value, name: name.value || undefined })
    store.user = data.user
    navigateTo('/')
  } catch (err: any) {
    error.value = err?.response?.data?.error || 'Ошибка регистрации'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f1f5f9;
}

.login-form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-form h1 {
  margin: 0;
  font-size: 1.25rem;
}

.login-form input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.login-form button {
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.login-form button:disabled {
  opacity: 0.6;
}

.error {
  color: #dc2626;
  font-size: 0.75rem;
  margin: 0;
}

.link {
  font-size: 0.75rem;
  color: #6b7280;
  text-align: center;
  margin: 0;
}

.link a { color: #2563eb; text-decoration: none; }
.link a:hover { text-decoration: underline; }
</style>
