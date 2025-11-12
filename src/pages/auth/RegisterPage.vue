<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')

const handleRegister = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  // Validation
  if (!firstName.value || !lastName.value || !email.value || !password.value) {
    errorMessage.value = 'Please fill in all required fields'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match'
    return
  }

  if (password.value.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters long'
    return
  }

  const { success, error } = await authStore.signUp(email.value, password.value, {
    firstName: firstName.value,
    lastName: lastName.value,
  })

  if (success) {
    successMessage.value = 'Account created successfully! Please check your email to confirm your account.'
    // Optionally redirect after a delay
    setTimeout(() => {
      router.push('/login')
    }, 3000)
  } else {
    errorMessage.value = error || 'Failed to create account. Please try again.'
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-golf-green to-golf-fairway py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Logo/Header -->
      <div class="text-center">
        <div class="flex justify-center mb-4">
          <img src="@/assets/logo.png" alt="Go4thePin Logo" class="h-24 w-auto" />
        </div>
        <h2 class="mt-6 text-3xl font-bold text-white">
          Create your account
        </h2>
        <p class="mt-2 text-sm text-green-100">
          Already have an account?
          <router-link to="/login" class="font-medium text-white hover:text-green-50 underline">
            Sign in
          </router-link>
        </p>
      </div>

      <!-- Register Form -->
      <div class="mt-8 bg-white rounded-lg shadow-2xl p-8">
        <form class="space-y-6" @submit.prevent="handleRegister">
          <!-- Success Message -->
          <div
            v-if="successMessage"
            class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg"
            role="alert"
          >
            <p class="text-sm">{{ successMessage }}</p>
          </div>

          <!-- Error Message -->
          <div
            v-if="errorMessage"
            class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
            role="alert"
          >
            <p class="text-sm">{{ errorMessage }}</p>
          </div>

          <!-- Name Fields -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="firstName" class="block text-sm font-medium text-gray-700">
                First name *
              </label>
              <div class="mt-1">
                <input
                  id="firstName"
                  v-model="firstName"
                  name="firstName"
                  type="text"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="John"
                />
              </div>
            </div>

            <div>
              <label for="lastName" class="block text-sm font-medium text-gray-700">
                Last name *
              </label>
              <div class="mt-1">
                <input
                  id="lastName"
                  v-model="lastName"
                  name="lastName"
                  type="text"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Doe"
                />
              </div>
            </div>
          </div>

          <!-- Email Field -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">
              Email address *
            </label>
            <div class="mt-1">
              <input
                id="email"
                v-model="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <!-- Password Field -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              Password *
            </label>
            <div class="mt-1">
              <input
                id="password"
                v-model="password"
                name="password"
                type="password"
                autocomplete="new-password"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
            <p class="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
          </div>

          <!-- Confirm Password Field -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
              Confirm password *
            </label>
            <div class="mt-1">
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                name="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <!-- Terms & Conditions -->
          <div class="flex items-start">
            <div class="flex items-center h-5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
            <div class="ml-3 text-sm">
              <label for="terms" class="font-medium text-gray-700">
                I agree to the terms and conditions
              </label>
            </div>
          </div>

          <!-- Submit Button -->
          <div>
            <button
              type="submit"
              :disabled="authStore.loading"
              class="w-full flex justify-center py-3 sm:py-2 px-4 border border-transparent rounded-lg shadow-sm text-base sm:text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="authStore.loading">Creating account...</span>
              <span v-else>Create account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
