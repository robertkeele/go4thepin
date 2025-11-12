<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/types/models'

const authStore = useAuthStore()
const router = useRouter()

interface CalendarEvent extends Event {
  courseName?: string
  registrationCount?: number
  isUserRegistered?: boolean
}

const events = ref<CalendarEvent[]>([])
const isLoading = ref(false)
const errorMessage = ref<string>('')
const currentDate = ref(new Date())

// Calendar navigation
const currentMonth = computed(() => currentDate.value.getMonth())
const currentYear = computed(() => currentDate.value.getFullYear())

const monthName = computed(() => {
  return new Date(currentYear.value, currentMonth.value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

// Get days in month
const daysInMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
})

// Get first day of month (0 = Sunday)
const firstDayOfMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value, 1).getDay()
})

// Generate calendar grid
const calendarDays = computed(() => {
  const days: Array<{ date: number | null, events: CalendarEvent[] }> = []

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfMonth.value; i++) {
    days.push({ date: null, events: [] })
  }

  // Add days of month
  for (let day = 1; day <= daysInMonth.value; day++) {
    const dayEvents = events.value.filter(event => {
      const eventDate = new Date(event.eventDate)
      return eventDate.getDate() === day &&
             eventDate.getMonth() === currentMonth.value &&
             eventDate.getFullYear() === currentYear.value
    })
    days.push({ date: day, events: dayEvents })
  }

  return days
})

const previousMonth = () => {
  const newDate = new Date(currentYear.value, currentMonth.value - 1, 1)
  currentDate.value = newDate
  loadEvents()
}

const nextMonth = () => {
  const newDate = new Date(currentYear.value, currentMonth.value + 1, 1)
  currentDate.value = newDate
  loadEvents()
}

const today = () => {
  currentDate.value = new Date()
  loadEvents()
}

const isToday = (day: number | null) => {
  if (!day) return false
  const today = new Date()
  return day === today.getDate() &&
         currentMonth.value === today.getMonth() &&
         currentYear.value === today.getFullYear()
}

// Load events for current month
const loadEvents = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const startOfMonth = new Date(currentYear.value, currentMonth.value, 1).toISOString().split('T')[0]
    const endOfMonth = new Date(currentYear.value, currentMonth.value + 1, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        course:courses(name)
      `)
      .gte('event_date', startOfMonth)
      .lte('event_date', endOfMonth)
      .order('event_date', { ascending: true })

    if (error) throw error
    if (!data) return

    // Load registration counts and user registration status
    const eventsWithData = await Promise.all(
      data.map(async (event: any) => {
        // Get total registration count
        const { count } = await supabase
          .from('event_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)

        // Check if current user is registered
        let isUserRegistered = false
        if (authStore.user) {
          const { data: userReg } = await supabase
            .from('event_registrations')
            .select('id')
            .eq('event_id', event.id)
            .eq('user_id', authStore.user.id)
            .single()

          isUserRegistered = !!userReg
        }

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
          registrationCount: count || 0,
          isUserRegistered
        }
      })
    )

    events.value = eventsWithData
  } catch (error: any) {
    errorMessage.value = `Failed to load events: ${error.message}`
  } finally {
    isLoading.value = false
  }
}

const viewEvent = (eventId: string) => {
  router.push({ name: 'event-detail', params: { id: eventId } })
}

const getEventTypeColor = (eventType: string) => {
  switch (eventType) {
    case 'tournament':
      return 'bg-purple-100 text-purple-800 border-purple-300'
    case 'league_play':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'social':
      return 'bg-blue-100 text-blue-800 border-blue-300'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

const getStatusBadge = (event: CalendarEvent) => {
  if (event.isUserRegistered) {
    return { text: '✓', class: 'bg-green-500 text-white' }
  }
  if (event.maxParticipants && event.registrationCount && event.registrationCount >= event.maxParticipants) {
    return { text: 'Full', class: 'bg-red-500 text-white' }
  }
  return null
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
          <div class="flex items-center">
            <button
              @click="router.push('/dashboard')"
              class="text-gray-600 hover:text-gray-900 mr-4"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 class="text-2xl font-bold text-gray-900">Events Calendar</h1>
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
              @click="router.push('/events')"
              class="text-sm text-gray-700 hover:text-gray-900 font-medium"
            >
              Events List
            </button>
            <template v-if="authStore.isAdmin">
              <span class="text-gray-300">|</span>
              <button
                @click="router.push('/events/create')"
                class="text-sm text-purple-700 hover:text-purple-900 font-medium"
              >
                Create Event
              </button>
            </template>
          </div>
        </div>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Error Message -->
      <div v-if="errorMessage" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
        {{ errorMessage }}
      </div>

      <!-- Calendar Header -->
      <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center space-x-4">
            <button
              @click="previousMonth"
              class="p-2 rounded-md hover:bg-gray-100"
            >
              <svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 class="text-2xl font-bold text-gray-900">{{ monthName }}</h2>
            <button
              @click="nextMonth"
              class="p-2 rounded-md hover:bg-gray-100"
            >
              <svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <button
            @click="today"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Today
          </button>
        </div>

        <!-- Legend -->
        <div class="flex items-center space-x-6 text-sm mb-4">
          <div class="flex items-center">
            <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span class="text-gray-600">Registered</span>
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span class="text-gray-600">Full</span>
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 bg-blue-200 rounded-full mr-2"></div>
            <span class="text-gray-600">Today</span>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <!-- Calendar Grid -->
        <div v-else class="border border-gray-200 rounded-lg overflow-hidden">
          <!-- Day Headers -->
          <div class="grid grid-cols-7 bg-gray-50">
            <div
              v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
              :key="day"
              class="py-2 text-center text-xs font-semibold text-gray-700 border-b border-gray-200"
            >
              {{ day }}
            </div>
          </div>

          <!-- Calendar Days -->
          <div class="grid grid-cols-7">
            <div
              v-for="(day, index) in calendarDays"
              :key="index"
              :class="[
                'min-h-24 border-b border-r border-gray-200 p-2',
                day.date ? 'bg-white hover:bg-gray-50' : 'bg-gray-50',
                isToday(day.date) ? 'bg-blue-50' : ''
              ]"
            >
              <div v-if="day.date" class="h-full">
                <div class="flex items-start justify-between mb-1">
                  <span
                    :class="[
                      'text-sm font-medium',
                      isToday(day.date) ? 'text-blue-600 font-bold' : 'text-gray-900'
                    ]"
                  >
                    {{ day.date }}
                  </span>
                </div>

                <!-- Events for this day -->
                <div class="space-y-1">
                  <div
                    v-for="event in day.events"
                    :key="event.id"
                    @click="viewEvent(event.id)"
                    :class="[
                      'text-xs p-1 rounded border cursor-pointer hover:shadow-md transition-shadow',
                      getEventTypeColor(event.eventType)
                    ]"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1 min-w-0">
                        <div class="font-medium truncate">{{ event.name }}</div>
                        <div class="text-xs opacity-75">{{ event.startTime }}</div>
                        <div v-if="event.maxParticipants" class="text-xs opacity-75">
                          {{ event.registrationCount }}/{{ event.maxParticipants }}
                        </div>
                      </div>
                      <div v-if="getStatusBadge(event)" :class="['ml-1 px-1.5 py-0.5 rounded text-xs font-medium', getStatusBadge(event)!.class]">
                        {{ getStatusBadge(event)!.text }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Upcoming Events Summary -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Events This Month</h3>
        <div v-if="events.length === 0" class="text-center py-8 text-gray-500">
          No events scheduled for this month
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="event in events"
            :key="event.id"
            @click="viewEvent(event.id)"
            class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <div class="flex-1">
              <div class="flex items-center space-x-3">
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-900">
                    {{ new Date(event.eventDate).getDate() }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short' }) }}
                  </div>
                </div>
                <div class="flex-1">
                  <h4 class="font-semibold text-gray-900">{{ event.name }}</h4>
                  <div class="text-sm text-gray-600">
                    {{ event.courseName }} • {{ event.startTime }}
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <div v-if="event.maxParticipants" class="text-sm text-gray-600">
                {{ event.registrationCount }}/{{ event.maxParticipants }} players
              </div>
              <div v-if="event.isUserRegistered" class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Registered
              </div>
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
