<template>
  <div>
    <h1>{{ error?.statusCode }}</h1>
    <p>{{ error?.message }}</p>
    <button @click="handleError">На главную</button>
  </div>
</template>

<script setup lang="ts">
const error = useError()

function handleError() {
  clearError({ redirect: '/' })
}
</script>
