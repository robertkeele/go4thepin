<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/types/models'

const authStore = useAuthStore()
const router = useRouter()

const events = ref<Array<Event & { courseName?: string, registrationCount?: number }>>([])
const isLoading = ref(false)
const errorMessage = ref<string>('')
const filter = ref<'all' | 'upcoming' | 'completed'>('upcoming')

// Load events
const loadEvents = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    let query = supabase
      .from('events')
      .select(`
        *,
        course:courses(name)
      `)

    // Apply filters
    if (filter.value === 'upcoming') {
      query = query.gte('event_date', new Date().toISOString().split('T')[0])
        .in('status', ['scheduled', 'in_progress'])
    } else if (filter.value === 'completed') {
      query = query.eq('status', 'completed')
    }

    query = query.order('event_date', { ascending: filter.value === 'upcoming' })

    const { data, error } = await query

    if (error) throw error
    if (!data) return

    // Load registration counts for each event
    const eventsWithCounts = await Promise.all(
      data.map(async (event: any) => {
        const { count } = await supabase
          .from('event_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)

        return {
          id: event.id,
          name: event.name,
          description: event.description,
          eventDate: event.event_date,
          startTime: event.start_time,
          courseId: event.course_id,
          teeBoxId: event.tee_box_id,
          scoringFormat: event.scoring_format,
          eventType: event.event_type,
          isTeamEvent: event.is_team_event,
          maxParticipants: event.max_participants,
          status: event.status,
          createdBy: event.created_by,
          createdAt: event.created_at,
          updatedAt: event.updated_at,
          courseName: event.course?.name,
          registrationCount: count || 0
        }
      })
    )

    events.value = eventsWithCounts
  } catch (error: any) {
    errorMessage.value = `Failed to load events: ${error.message}`
  } finally {
    isLoading.value = false
  }
}

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Format time
const formatTime = (timeString: string | null | undefined) => {
  if (!timeString) return ''
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

// Status badge color
const statusColor = (status: string) => {
  switch (status) {
    case 'scheduled': return 'bg-blue-100 text-blue-800'
    case 'in_progress': return 'bg-green-100 text-green-800'
    case 'completed': return 'bg-gray-100 text-gray-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

// Change filter
const changeFilter = (newFilter: 'all' | 'upcoming' | 'completed') => {
  filter.value = newFilter
  loadEvents()
}

onMounted(() => {
  loadEvents()
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
            <h1 class="text-2xl font-bold text-gray-900">Events</h1>
          </div>
          <div class="flex items-center space-x-3">
            <button
              @click="router.push('/events-calendar')"
              class="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              📆 Calendar View
            </button>
            <button
              v-if="authStore.isAdmin"
              @click="router.push('/events/create')"
              class="px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              + Create Event
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">

        <!-- Filter Tabs -->
        <div class="mb-6 border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button
              @click="changeFilter('upcoming')"
              :class="[
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                filter === 'upcoming'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              Upcoming
            </button>
            <button
              @click="changeFilter('all')"
              :class="[
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                filter === 'all'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              All Events
            </button>
            <button
              @click="changeFilter('completed')"
              :class="[
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                filter === 'completed'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              Past Events
            </button>
          </nav>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-sm text-red-700">{{ errorMessage }}</p>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-12">
          <p class="text-gray-600">Loading events...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="events.length === 0" class="text-center py-12">
          <div class="bg-white rounded-lg shadow p-8">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No events found</h3>
            <p class="mt-1 text-sm text-gray-500">
              {{ filter === 'upcoming' ? 'No upcoming events scheduled.' : 'No events to display.' }}
            </p>
            <div v-if="authStore.isAdmin" class="mt-6">
              <button
                @click="router.push('/events/create')"
                class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>

        <!-- Events Grid -->
        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="event in events"
            :key="event.id"
            @click="router.push(`/events/${event.id}`)"
            class="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
          >
            <!-- Event Header -->
            <div class="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
              <h3 class="text-lg font-semibold text-white truncate">
                {{ event.name }}
              </h3>
              <p class="text-primary-100 text-sm mt-1">
                {{ event.courseName }}
              </p>
            </div>

            <!-- Event Details -->
            <div class="px-6 py-4">
              <div class="flex items-center text-sm text-gray-600 mb-2">
                <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ formatDate(event.eventDate) }}
              </div>

              <div v-if="event.startTime" class="flex items-center text-sm text-gray-600 mb-2">
                <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ formatTime(event.startTime) }}
              </div>

              <div class="flex items-center justify-between mt-4">
                <span
                  :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusColor(event.status)]"
                >
                  {{ event.status }}
                </span>

                <span class="text-sm text-gray-600">
                  {{ event.registrationCount }}{{ event.maxParticipants ? `/${event.maxParticipants}` : '' }} registered
                </span>
              </div>

              <div v-if="event.description" class="mt-4 text-sm text-gray-600 line-clamp-2">
                {{ event.description }}
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>
