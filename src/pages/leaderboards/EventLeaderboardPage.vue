<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRealtimeLeaderboard } from '@/composables/useRealtimeLeaderboard'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/types/models'

const route = useRoute()
const router = useRouter()

const eventId = computed(() => route.params.id as string)
const sortBy = ref<'gross' | 'net'>('net')
const event = ref<Event | null>(null)
const isLoadingEvent = ref(false)

// Use realtime leaderboard
const { leaderboard, isConnected, isLoading, errorMessage, subscribe, refresh } = useRealtimeLeaderboard(
  eventId.value,
  sortBy.value
)

// Load event details
const loadEvent = async () => {
  isLoadingEvent.value = true

  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        course:courses(name),
        tee_box:tee_boxes(name, color)
      `)
      .eq('id', eventId.value)
      .single()

    if (error) throw error

    const eventData = data as any
    event.value = {
      id: eventData.id,
      name: eventData.name,
      description: eventData.description,
      eventDate: eventData.event_date,
      startTime: eventData.start_time,
      courseId: eventData.course_id,
      teeBoxId: eventData.tee_box_id,
      scoringFormat: eventData.scoring_format,
      eventType: eventData.event_type,
      isTeamEvent: eventData.is_team_event,
      maxParticipants: eventData.max_participants,
      status: eventData.status,
      createdBy: eventData.created_by,
      createdAt: eventData.created_at,
      updatedAt: eventData.updated_at
    }
  } catch (error: any) {
    console.error('Failed to load event:', error)
  } finally {
    isLoadingEvent.value = false
  }
}

// Get position badge class
const getPositionClass = (position: number) => {
  if (position === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
  if (position === 2) return 'bg-gray-100 text-gray-800 border-gray-300'
  if (position === 3) return 'bg-orange-100 text-orange-800 border-orange-300'
  return 'bg-white text-gray-700 border-gray-200'
}

// Get position emoji
const getPositionEmoji = (position: number) => {
  if (position === 1) return '🥇'
  if (position === 2) return '🥈'
  if (position === 3) return '🥉'
  return ''
}

// Format score to par
const formatScoreToPar = (score: number, par: number = 72) => {
  const diff = score - par
  if (diff === 0) return 'E'
  if (diff > 0) return `+${diff}`
  return diff.toString()
}

// Handle sort change
const handleSortChange = async () => {
  // Would need to reinitialize with new sort, for now just refresh
  await refresh()
}

onMounted(async () => {
  await loadEvent()
  await subscribe()
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
              @click="router.push('/events')"
              class="text-gray-500 hover:text-gray-700"
            >
              ← Back to Events
            </button>
            <h1 class="text-2xl font-bold text-gray-900">Leaderboard</h1>
          </div>
          <div class="flex items-center space-x-4">
            <!-- Live indicator -->
            <div v-if="isConnected" class="flex items-center text-sm">
              <span class="flex h-2 w-2 mr-2">
                <span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span class="text-green-700 font-medium">Live</span>
            </div>
            <button
              @click="refresh"
              :disabled="isLoading"
              class="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">

        <!-- Event Info -->
        <div v-if="event" class="bg-white rounded-lg shadow p-6 mb-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ event.name }}</h2>
          <p v-if="event.description" class="text-gray-600 mb-4">{{ event.description }}</p>
          <div class="flex flex-wrap gap-4 text-sm text-gray-600">
            <div>
              <span class="font-medium">Date:</span>
              {{ new Date(event.eventDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              }) }}
            </div>
            <div>
              <span class="font-medium">Format:</span>
              {{ event.scoringFormat.charAt(0).toUpperCase() + event.scoringFormat.slice(1) }} Play
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-sm text-red-700">{{ errorMessage }}</p>
        </div>

        <!-- Scoring Toggle -->
        <div class="bg-white rounded-lg shadow p-4 mb-4">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium text-gray-900">Scoring</h3>
            <div class="flex gap-2">
              <button
                @click="sortBy = 'gross'; handleSortChange()"
                :class="[
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  sortBy === 'gross'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                ]"
              >
                Gross
              </button>
              <button
                @click="sortBy = 'net'; handleSortChange()"
                :class="[
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  sortBy === 'net'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                ]"
              >
                Net
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading && leaderboard.length === 0" class="text-center py-12">
          <p class="text-gray-600">Loading leaderboard...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="leaderboard.length === 0" class="text-center py-12">
          <div class="bg-white rounded-lg shadow p-8">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No scores yet</h3>
            <p class="mt-1 text-sm text-gray-500">Scores will appear here as players complete their rounds.</p>
          </div>
        </div>

        <!-- Leaderboard Table -->
        <div v-else class="bg-white shadow rounded-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pos
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    HDCP
                  </th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross
                  </th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net
                  </th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    To Par
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="entry in leaderboard"
                  :key="entry.userId"
                  class="hover:bg-gray-50 transition-colors"
                >
                  <!-- Position -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <span
                        :class="[
                          'inline-flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold',
                          getPositionClass(entry.position)
                        ]"
                      >
                        {{ getPositionEmoji(entry.position) || entry.position }}
                      </span>
                    </div>
                  </td>

                  <!-- Player Name -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">
                      {{ entry.userName }}
                    </div>
                  </td>

                  <!-- Handicap -->
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="text-sm text-gray-900">
                      {{ entry.courseHandicap || '-' }}
                    </span>
                  </td>

                  <!-- Gross Score -->
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="text-lg font-semibold text-gray-900">
                      {{ entry.grossScore }}
                    </span>
                  </td>

                  <!-- Net Score -->
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="text-lg font-semibold text-primary-600">
                      {{ entry.netScore }}
                    </span>
                  </td>

                  <!-- To Par -->
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      :class="[
                        'text-sm font-medium',
                        entry.scoreToPar && entry.scoreToPar < 0 ? 'text-green-600' :
                        entry.scoreToPar && entry.scoreToPar > 0 ? 'text-red-600' :
                        'text-gray-900'
                      ]"
                    >
                      {{ entry.scoreToPar !== undefined ? formatScoreToPar(entry.grossScore) : '-' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>
