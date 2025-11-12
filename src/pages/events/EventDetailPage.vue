<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const event = ref<any>(null)
const participants = ref<any[]>([])
const isLoading = ref(false)
const isRegistering = ref(false)
const errorMessage = ref<string>('')
const successMessage = ref<string>('')

const eventId = route.params.id as string

// Check if user is registered
const isUserRegistered = computed(() => {
  return participants.value.some(p => p.userId === authStore.user?.id)
})

// Check if event is full
const isEventFull = computed(() => {
  if (!event.value?.maxParticipants) return false
  return participants.value.length >= event.value.maxParticipants
})

// Can user register
const canRegister = computed(() => {
  return !isUserRegistered.value && !isEventFull.value && event.value?.status === 'scheduled'
})

// Load event details
const loadEvent = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        course:courses(*),
        tee_box:tee_boxes(*)
      `)
      .eq('id', eventId)
      .single()

    if (error) throw error
    if (!data) throw new Error('Event not found')

    event.value = {
      id: data.id,
      name: data.name,
      description: data.description,
      eventDate: data.event_date,
      startTime: data.start_time,
      courseId: data.course_id,
      teeBoxId: data.tee_box_id,
      scoringFormat: data.scoring_format,
      eventType: data.event_type,
      isTeamEvent: data.is_team_event,
      maxParticipants: data.max_participants,
      status: data.status,
      createdBy: data.created_by,
      course: data.course,
      teeBox: data.tee_box
    }

    await loadParticipants()
  } catch (error: any) {
    errorMessage.value = `Failed to load event: ${error.message}`
  } finally {
    isLoading.value = false
  }
}

// Load participants
const loadParticipants = async () => {
  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .select(`
        *,
        user:profiles(id, first_name, last_name, current_handicap_index)
      `)
      .eq('event_id', eventId)
      .eq('status', 'registered')

    if (error) throw error
    if (!data) return

    participants.value = data.map((reg: any) => ({
      id: reg.id,
      userId: reg.user.id,
      firstName: reg.user.first_name,
      lastName: reg.user.last_name,
      handicapIndex: reg.user.current_handicap_index,
      registeredAt: reg.registered_at
    }))
  } catch (error: any) {
    console.error('Failed to load participants:', error)
  }
}

// Register for event
const registerForEvent = async () => {
  if (!authStore.user?.id) return

  isRegistering.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const registrationData: any = {
      event_id: eventId,
      user_id: authStore.user.id,
      status: 'registered'
    }

    const { error } = await (supabase
      .from('event_registrations') as any)
      .insert(registrationData)

    if (error) throw error

    successMessage.value = 'Successfully registered for event!'
    await loadParticipants()

    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error: any) {
    errorMessage.value = `Failed to register: ${error.message}`
  } finally {
    isRegistering.value = false
  }
}

// Unregister from event
const unregisterFromEvent = async () => {
  if (!authStore.user?.id) return

  if (!confirm('Are you sure you want to unregister from this event?')) return

  isRegistering.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const { error } = await supabase
      .from('event_registrations')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', authStore.user.id)

    if (error) throw error

    successMessage.value = 'Successfully unregistered from event'
    await loadParticipants()

    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error: any) {
    errorMessage.value = `Failed to unregister: ${error.message}`
  } finally {
    isRegistering.value = false
  }
}

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Format time
const formatTime = (timeString: string | null | undefined) => {
  if (!timeString) return 'TBD'
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

onMounted(() => {
  loadEvent()
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
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">

        <!-- Error Message -->
        <div v-if="errorMessage" class="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-sm text-red-700">{{ errorMessage }}</p>
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <p class="text-sm text-green-700">{{ successMessage }}</p>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-12">
          <p class="text-gray-600">Loading event...</p>
        </div>

        <!-- Event Details -->
        <div v-else-if="event">
          <!-- Header Card -->
          <div class="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div class="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8">
              <div class="flex justify-between items-start">
                <div>
                  <h1 class="text-3xl font-bold text-white">{{ event.name }}</h1>
                  <p class="text-primary-100 mt-2 text-lg">{{ event.course?.name }}</p>
                </div>
                <span
                  :class="['inline-flex items-center px-3 py-1 rounded-full text-sm font-medium', statusColor(event.status)]"
                >
                  {{ event.status }}
                </span>
              </div>
            </div>

            <div class="px-6 py-6">
              <!-- Event Info -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 class="text-sm font-medium text-gray-500 mb-2">Date & Time</h3>
                  <p class="text-lg text-gray-900">{{ formatDate(event.eventDate) }}</p>
                  <p class="text-sm text-gray-600">{{ formatTime(event.startTime) }}</p>
                </div>

                <div>
                  <h3 class="text-sm font-medium text-gray-500 mb-2">Course Details</h3>
                  <p class="text-lg text-gray-900">{{ event.course?.name }}</p>
                  <p class="text-sm text-gray-600">
                    {{ event.teeBox?.name }} Tees • Par {{ event.course?.total_par }}
                  </p>
                </div>

                <div>
                  <h3 class="text-sm font-medium text-gray-500 mb-2">Format</h3>
                  <p class="text-lg text-gray-900 capitalize">{{ event.scoringFormat }} Play</p>
                  <p class="text-sm text-gray-600 capitalize">{{ event.eventType }}</p>
                </div>

                <div>
                  <h3 class="text-sm font-medium text-gray-500 mb-2">Registration</h3>
                  <p class="text-lg text-gray-900">
                    {{ participants.length }}{{ event.maxParticipants ? `/${event.maxParticipants}` : '' }} Players
                  </p>
                  <p v-if="isEventFull" class="text-sm text-red-600">Event Full</p>
                  <p v-else class="text-sm text-green-600">Registration Open</p>
                </div>
              </div>

              <!-- Description -->
              <div v-if="event.description" class="mb-6">
                <h3 class="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <p class="text-gray-900">{{ event.description }}</p>
              </div>

              <!-- Registration Button -->
              <div class="flex justify-end space-x-3">
                <button
                  v-if="isUserRegistered"
                  @click="unregisterFromEvent"
                  :disabled="isRegistering"
                  class="px-6 py-3 border border-red-300 text-red-700 font-medium rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                >
                  {{ isRegistering ? 'Unregistering...' : 'Unregister' }}
                </button>
                <button
                  v-else-if="canRegister"
                  @click="registerForEvent"
                  :disabled="isRegistering"
                  class="px-6 py-3 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
                >
                  {{ isRegistering ? 'Registering...' : 'Register for Event' }}
                </button>
                <button
                  v-else-if="isEventFull"
                  disabled
                  class="px-6 py-3 bg-gray-300 text-gray-500 font-medium rounded-md cursor-not-allowed"
                >
                  Event Full
                </button>
              </div>
            </div>
          </div>

          <!-- Participants List -->
          <div class="bg-white shadow rounded-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-medium text-gray-900">
                Registered Players ({{ participants.length }})
              </h2>
            </div>
            <div class="px-6 py-4">
              <div v-if="participants.length === 0" class="text-center py-8 text-gray-500">
                No players registered yet
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="participant in participants"
                  :key="participant.id"
                  class="flex justify-between items-center py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p class="font-medium text-gray-900">
                      {{ participant.firstName }} {{ participant.lastName }}
                      <span v-if="participant.userId === authStore.user?.id" class="ml-2 text-sm text-primary-600">(You)</span>
                    </p>
                    <p class="text-sm text-gray-500">
                      Registered {{ new Date(participant.registeredAt).toLocaleDateString() }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm text-gray-500">Handicap</p>
                    <p class="font-medium text-gray-900">{{ participant.handicapIndex || '-' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>
