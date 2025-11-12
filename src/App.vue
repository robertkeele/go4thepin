<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(async () => {
  // Initialize authentication state on app mount
  await authStore.initializeAuth()
})
</script>

<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<style>
/* Global styles are in assets/main.css */
#app {
  min-height: 100vh;
}
</style>
