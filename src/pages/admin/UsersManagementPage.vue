<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

// Redirect if not admin
if (!authStore.isAdmin) {
  router.push('/dashboard')
}

interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  ghin_number: string | null
  role: 'admin' | 'member' | 'viewer'
  current_handicap_index: number | null
  created_at: string
}

const users = ref<UserProfile[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')
const roleFilter = ref<'all' | 'admin' | 'member' | 'viewer'>('all')
const editingUserId = ref<string | null>(null)
const savingUserId = ref<string | null>(null)

const filteredUsers = computed(() => {
  let filtered = users.value

  // Filter by role
  if (roleFilter.value !== 'all') {
    filtered = filtered.filter(user => user.role === roleFilter.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(user => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
      const email = user.email.toLowerCase()
      const ghin = user.ghin_number?.toLowerCase() || ''
      return fullName.includes(query) || email.includes(query) || ghin.includes(query)
    })
  }

  return filtered
})

const fetchUsers = async () => {
  try {
    loading.value = true
    error.value = null

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) throw fetchError

    users.value = data || []
  } catch (err: any) {
    error.value = err.message
    console.error('Error fetching users:', err)
  } finally {
    loading.value = false
  }
}

const updateUserRole = async (userId: string, newRole: 'admin' | 'member' | 'viewer') => {
  try {
    savingUserId.value = userId

    const { error: updateError } = await supabase
      .from('profiles')
      // @ts-ignore - Supabase v2.45.4 type inference limitation
      .update({ role: newRole })
      .eq('id', userId)

    if (updateError) throw updateError

    // Update local state
    const userIndex = users.value.findIndex(u => u.id === userId)
    if (userIndex !== -1) {
      users.value[userIndex].role = newRole
    }

    editingUserId.value = null
  } catch (err: any) {
    error.value = err.message
    console.error('Error updating user role:', err)
  } finally {
    savingUserId.value = null
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-800'
    case 'member':
      return 'bg-green-100 text-green-800'
    case 'viewer':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Navigation Header -->
    <nav class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <button
              @click="router.push('/dashboard')"
              class="text-gray-600 hover:text-gray-900 mr-4"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 class="text-2xl font-bold text-gray-900">User Management</h1>
          </div>
          <div class="flex items-center space-x-4">
            <button
              @click="router.push('/dashboard')"
              class="text-sm text-gray-700 hover:text-gray-900 font-medium"
            >
              Dashboard
            </button>
            <span class="text-gray-300">|</span>
            <button
              @click="router.push('/courses')"
              class="text-sm text-gray-700 hover:text-gray-900 font-medium"
            >
              Courses
            </button>
          </div>
        </div>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <p class="text-sm text-gray-600">
          Manage user roles and permissions
        </p>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Search -->
          <div>
            <label for="search" class="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <input
              id="search"
              v-model="searchQuery"
              type="text"
              placeholder="Search by name, email, or GHIN..."
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <!-- Role Filter -->
          <div>
            <label for="role-filter" class="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <select
              id="role-filter"
              v-model="roleFilter"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
        {{ error }}
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-lg shadow-sm p-12 text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p class="mt-4 text-gray-600">Loading users...</p>
      </div>

      <!-- Users Table -->
      <div v-else-if="filteredUsers.length > 0" class="bg-white rounded-lg shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GHIN
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Handicap
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span class="text-primary-700 font-medium">
                          {{ (user.first_name?.[0] || user.email[0]).toUpperCase() }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}` : 'No name' }}
                      </div>
                      <div v-if="user.phone" class="text-sm text-gray-500">
                        {{ user.phone }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ user.email }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ user.ghin_number || '-' }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ user.current_handicap_index !== null ? user.current_handicap_index.toFixed(1) : '-' }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="editingUserId === user.id" class="flex items-center space-x-2">
                    <select
                      :value="user.role"
                      @change="updateUserRole(user.id, ($event.target as HTMLSelectElement).value as any)"
                      :disabled="savingUserId === user.id"
                      class="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      v-if="savingUserId !== user.id"
                      @click="editingUserId = null"
                      class="text-gray-400 hover:text-gray-600"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <span v-else :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', getRoleBadgeClass(user.role)]">
                    {{ user.role }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(user.created_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    v-if="editingUserId !== user.id && user.id !== authStore.user?.id"
                    @click="editingUserId = user.id"
                    class="text-primary-600 hover:text-primary-900"
                  >
                    Edit Role
                  </button>
                  <span v-else-if="user.id === authStore.user?.id" class="text-gray-400">
                    (You)
                  </span>
                  <div v-else-if="savingUserId === user.id" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Summary -->
        <div class="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <p class="text-sm text-gray-600">
            Showing {{ filteredUsers.length }} of {{ users.length }} users
          </p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white rounded-lg shadow-sm p-12 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <h3 class="mt-4 text-lg font-medium text-gray-900">No users found</h3>
        <p class="mt-2 text-sm text-gray-500">
          {{ searchQuery || roleFilter !== 'all' ? 'Try adjusting your filters' : 'No users in the system yet' }}
        </p>
      </div>
    </div>
  </div>
</template>
