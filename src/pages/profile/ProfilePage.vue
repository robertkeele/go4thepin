<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

const authStore = useAuthStore()
const router = useRouter()

const isEditing = ref(false)
const isSaving = ref(false)
const errorMessage = ref<string>('')
const successMessage = ref<string>('')

// Form data
const formData = ref({
  firstName: '',
  lastName: '',
  phone: '',
  ghinNumber: '',
  currentHandicapIndex: null as number | null
})

// Load current user data
const loadUserData = () => {
  if (authStore.user) {
    formData.value = {
      firstName: authStore.user.firstName || '',
      lastName: authStore.user.lastName || '',
      phone: authStore.user.phone || '',
      ghinNumber: authStore.user.ghinNumber || '',
      currentHandicapIndex: authStore.user.currentHandicapIndex || null
    }
  }
}

// Save profile
const saveProfile = async () => {
  if (!authStore.user?.id) return

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const updateData: any = {
      first_name: formData.value.firstName,
      last_name: formData.value.lastName,
      phone: formData.value.phone,
      ghin_number: formData.value.ghinNumber,
      current_handicap_index: formData.value.currentHandicapIndex
    }

    const { error } = await (supabase
      .from('profiles') as any)
      .update(updateData)
      .eq('id', authStore.user.id)

    if (error) throw error

    // Update local auth store
    await authStore.fetchUserProfile(authStore.user.id)

    successMessage.value = 'Profile updated successfully!'
    isEditing.value = false

    // Clear success message after 3 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)

  } catch (error: any) {
    errorMessage.value = `Failed to update profile: ${error.message}`
  } finally {
    isSaving.value = false
  }
}

// Cancel editing
const cancelEdit = () => {
  isEditing.value = false
  loadUserData()
  errorMessage.value = ''
}

onMounted(() => {
  loadUserData()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Navigation Header -->
    <nav class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center space-x-4">
            <button
              @click="router.push('/dashboard')"
              class="text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <h1 class="text-2xl font-bold text-gray-900">My Profile</h1>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">

        <!-- Error Message -->
        <div v-if="errorMessage" class="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-sm text-red-700">{{ errorMessage }}</p>
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <p class="text-sm text-green-700">{{ successMessage }}</p>
        </div>

        <!-- Profile Card -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <!-- Header -->
          <div class="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-2xl font-bold text-white">
                  {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
                </h2>
                <p class="text-primary-100 mt-1">{{ authStore.user?.email }}</p>
              </div>
              <div class="text-right">
                <div class="text-sm text-primary-100">Handicap Index</div>
                <div class="text-3xl font-bold text-white">
                  {{ authStore.user?.currentHandicapIndex || '-' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Profile Form -->
          <div class="px-6 py-6">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-lg font-medium text-gray-900">Profile Information</h3>
              <button
                v-if="!isEditing"
                @click="isEditing = true"
                class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Edit Profile
              </button>
            </div>

            <form @submit.prevent="saveProfile" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- First Name -->
                <div>
                  <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    v-model="formData.firstName"
                    type="text"
                    :disabled="!isEditing"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-600"
                    required
                  />
                </div>

                <!-- Last Name -->
                <div>
                  <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    v-model="formData.lastName"
                    type="text"
                    :disabled="!isEditing"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-600"
                    required
                  />
                </div>

                <!-- Email (Read-only) -->
                <div>
                  <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    :value="authStore.user?.email"
                    type="email"
                    disabled
                    class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  />
                  <p class="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                </div>

                <!-- Phone -->
                <div>
                  <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    v-model="formData.phone"
                    type="tel"
                    :disabled="!isEditing"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <!-- GHIN Number -->
                <div>
                  <label for="ghinNumber" class="block text-sm font-medium text-gray-700 mb-1">
                    GHIN Number
                  </label>
                  <input
                    id="ghinNumber"
                    v-model="formData.ghinNumber"
                    type="text"
                    :disabled="!isEditing"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <!-- Handicap Index -->
                <div>
                  <label for="handicapIndex" class="block text-sm font-medium text-gray-700 mb-1">
                    Handicap Index
                  </label>
                  <input
                    id="handicapIndex"
                    v-model.number="formData.currentHandicapIndex"
                    type="number"
                    step="0.1"
                    :disabled="!isEditing"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <!-- Role (Read-only) -->
                <div>
                  <label for="role" class="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <div class="mt-2">
                    <span
                      class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                      :class="{
                        'bg-purple-100 text-purple-800': authStore.isAdmin,
                        'bg-green-100 text-green-800': authStore.isMember
                      }"
                    >
                      {{ authStore.user?.role }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div v-if="isEditing" class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  @click="cancelEdit"
                  :disabled="isSaving"
                  class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="isSaving"
                  class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
                >
                  {{ isSaving ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Account Info -->
        <div class="mt-6 bg-white shadow rounded-lg p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
          <dl class="grid grid-cols-1 gap-4">
            <div>
              <dt class="text-sm font-medium text-gray-500">Member Since</dt>
              <dd class="mt-1 text-sm text-gray-900">
                {{ new Date(authStore.user?.createdAt || '').toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) }}
              </dd>
            </div>
          </dl>
        </div>

      </div>
    </main>
  </div>
</template>
