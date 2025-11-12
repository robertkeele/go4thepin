<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const handleSignOut = async () => {
  await authStore.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Navigation Header -->
    <nav class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-2xl font-bold text-gray-900">⛳ Golf League</h1>
          </div>
          <div class="flex items-center space-x-4">
            <button
              @click="router.push('/profile')"
              class="text-sm text-gray-700 hover:text-gray-900 font-medium"
            >
              My Profile
            </button>
            <span class="text-gray-300">|</span>
            <span class="text-sm text-gray-700">
              <span class="font-semibold">{{ authStore.user?.firstName || authStore.user?.email }}</span>
            </span>
            <button
              @click="handleSignOut"
              class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <!-- Welcome Card -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-4">
              Welcome to Your Dashboard!
            </h2>
            <p class="text-gray-600 mb-4">
              Your golf league tracking application is now set up and ready to use.
            </p>

            <!-- User Info -->
            <div class="mt-6 border-t border-gray-200 pt-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Your Profile</h3>
              <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt class="text-sm font-medium text-gray-500">Full Name</dt>
                  <dd class="mt-1 text-sm text-gray-900">
                    {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Email</dt>
                  <dd class="mt-1 text-sm text-gray-900">{{ authStore.user?.email }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Role</dt>
                  <dd class="mt-1">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="{
                        'bg-purple-100 text-purple-800': authStore.isAdmin,
                        'bg-green-100 text-green-800': authStore.isMember
                      }"
                    >
                      {{ authStore.user?.role }}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500">Handicap Index</dt>
                  <dd class="mt-1 text-sm text-gray-900">
                    {{ authStore.user?.currentHandicapIndex || 'Not set' }}
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Quick Actions -->
            <div class="mt-8">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  @click="router.push('/rounds/enter')"
                  class="bg-primary-50 hover:bg-primary-100 rounded-lg p-4 text-center transition-colors cursor-pointer"
                >
                  <div class="text-3xl mb-2">⛳</div>
                  <h4 class="text-sm font-medium text-gray-900">Enter Scores</h4>
                  <p class="mt-1 text-xs text-gray-600">Record a new round</p>
                </button>
                <button
                  @click="router.push('/rounds/history')"
                  class="bg-primary-50 hover:bg-primary-100 rounded-lg p-4 text-center transition-colors cursor-pointer"
                >
                  <div class="text-3xl mb-2">📊</div>
                  <h4 class="text-sm font-medium text-gray-900">My Rounds</h4>
                  <p class="mt-1 text-xs text-gray-600">View your history</p>
                </button>
                <button
                  @click="router.push('/events')"
                  class="bg-primary-50 hover:bg-primary-100 rounded-lg p-4 text-center transition-colors cursor-pointer"
                >
                  <div class="text-3xl mb-2">📅</div>
                  <h4 class="text-sm font-medium text-gray-900">Events</h4>
                  <p class="mt-1 text-xs text-gray-600">Browse and register</p>
                </button>
                <button
                  @click="router.push('/profile')"
                  class="bg-primary-50 hover:bg-primary-100 rounded-lg p-4 text-center transition-colors cursor-pointer"
                >
                  <div class="text-3xl mb-2">👤</div>
                  <h4 class="text-sm font-medium text-gray-900">My Profile</h4>
                  <p class="mt-1 text-xs text-gray-600">Edit your info</p>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Next Steps -->
        <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 class="text-sm font-medium text-blue-900 mb-2">🎯 Next Steps</h3>
          <ul class="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Run the database migrations in your Supabase dashboard</li>
            <li>Explore your profile and settings</li>
            <li>Start tracking your golf rounds</li>
            <li>Invite other members to join the league</li>
          </ul>
        </div>
      </div>
    </main>
  </div>
</template>
