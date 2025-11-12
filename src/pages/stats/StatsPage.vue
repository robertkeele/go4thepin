<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useStats } from '@/composables/useStats'
import type { UserStats } from '@/composables/useStats'

const authStore = useAuthStore()
const router = useRouter()
const { fetchUserStats, isLoading } = useStats()

const stats = ref<UserStats | null>(null)

// Load statistics
onMounted(async () => {
  if (authStore.user?.id) {
    stats.value = await fetchUserStats(authStore.user.id)
  }
})

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Calculate scoring percentages
const getScoringPercentage = (count: number) => {
  if (!stats.value) return 0
  const total = Object.values(stats.value.scoringAverages).reduce((sum, val) => sum + val, 0)
  return total > 0 ? Math.round((count / total) * 100) : 0
}
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
            <h1 class="text-2xl font-bold text-gray-900">My Statistics</h1>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-12">
          <p class="text-gray-600">Loading statistics...</p>
        </div>

        <!-- No Data State -->
        <div v-else-if="!stats || stats.totalRounds === 0" class="text-center py-12">
          <div class="bg-white rounded-lg shadow p-8">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No statistics yet</h3>
            <p class="mt-1 text-sm text-gray-500">Start playing rounds to see your statistics.</p>
            <div class="mt-6">
              <button
                @click="router.push('/rounds/enter')"
                class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Enter Your First Round
              </button>
            </div>
          </div>
        </div>

        <!-- Statistics Display -->
        <div v-else>
          <!-- Overview Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <!-- Total Rounds -->
            <div class="bg-white rounded-lg shadow p-6">
              <div class="text-sm font-medium text-gray-500 mb-2">Total Rounds</div>
              <div class="text-3xl font-bold text-gray-900">{{ stats.totalRounds }}</div>
            </div>

            <!-- Average Score -->
            <div class="bg-white rounded-lg shadow p-6">
              <div class="text-sm font-medium text-gray-500 mb-2">Average Score</div>
              <div class="text-3xl font-bold text-gray-900">{{ stats.averageScore }}</div>
            </div>

            <!-- Best Round -->
            <div class="bg-white rounded-lg shadow p-6">
              <div class="text-sm font-medium text-gray-500 mb-2">Best Round</div>
              <div class="text-3xl font-bold text-green-600">{{ stats.lowestScore }}</div>
              <div v-if="stats.bestRound" class="text-xs text-gray-500 mt-1">
                {{ stats.bestRound.courseName }}
              </div>
            </div>

            <!-- Worst Round -->
            <div class="bg-white rounded-lg shadow p-6">
              <div class="text-sm font-medium text-gray-500 mb-2">Highest Round</div>
              <div class="text-3xl font-bold text-red-600">{{ stats.highestScore }}</div>
            </div>
          </div>

          <!-- Scoring Distribution -->
          <div class="bg-white rounded-lg shadow p-6 mb-6">
            <h2 class="text-lg font-medium text-gray-900 mb-6">Scoring Distribution</h2>

            <div class="space-y-4">
              <!-- Eagles -->
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-gray-700">Eagles (≤-2)</span>
                  <span class="text-gray-600">
                    {{ stats.scoringAverages.eagles }} ({{ getScoringPercentage(stats.scoringAverages.eagles) }}%)
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-green-600 h-2 rounded-full transition-all"
                    :style="{ width: `${getScoringPercentage(stats.scoringAverages.eagles)}%` }"
                  ></div>
                </div>
              </div>

              <!-- Birdies -->
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-gray-700">Birdies (-1)</span>
                  <span class="text-gray-600">
                    {{ stats.scoringAverages.birdies }} ({{ getScoringPercentage(stats.scoringAverages.birdies) }}%)
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-blue-500 h-2 rounded-full transition-all"
                    :style="{ width: `${getScoringPercentage(stats.scoringAverages.birdies)}%` }"
                  ></div>
                </div>
              </div>

              <!-- Pars -->
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-gray-700">Pars (E)</span>
                  <span class="text-gray-600">
                    {{ stats.scoringAverages.pars }} ({{ getScoringPercentage(stats.scoringAverages.pars) }}%)
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-gray-500 h-2 rounded-full transition-all"
                    :style="{ width: `${getScoringPercentage(stats.scoringAverages.pars)}%` }"
                  ></div>
                </div>
              </div>

              <!-- Bogeys -->
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-gray-700">Bogeys (+1)</span>
                  <span class="text-gray-600">
                    {{ stats.scoringAverages.bogeys }} ({{ getScoringPercentage(stats.scoringAverages.bogeys) }}%)
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-orange-500 h-2 rounded-full transition-all"
                    :style="{ width: `${getScoringPercentage(stats.scoringAverages.bogeys)}%` }"
                  ></div>
                </div>
              </div>

              <!-- Double Bogeys -->
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-gray-700">Double Bogeys (+2)</span>
                  <span class="text-gray-600">
                    {{ stats.scoringAverages.doubleBogeys }} ({{ getScoringPercentage(stats.scoringAverages.doubleBogeys) }}%)
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-red-500 h-2 rounded-full transition-all"
                    :style="{ width: `${getScoringPercentage(stats.scoringAverages.doubleBogeys)}%` }"
                  ></div>
                </div>
              </div>

              <!-- Worse -->
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-gray-700">Triple+ (≥+3)</span>
                  <span class="text-gray-600">
                    {{ stats.scoringAverages.worse }} ({{ getScoringPercentage(stats.scoringAverages.worse) }}%)
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-red-700 h-2 rounded-full transition-all"
                    :style="{ width: `${getScoringPercentage(stats.scoringAverages.worse)}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Form -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-medium text-gray-900 mb-4">Recent Form</h2>

            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="(round, index) in stats.recentForm" :key="index" class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ formatDate(round.date) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ round.courseName }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                      <span class="text-lg font-semibold text-gray-900">
                        {{ round.score }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>
