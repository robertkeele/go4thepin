<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useLeaderboard } from '@/composables/useLeaderboard'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const { fetchEventLeaderboard } = useLeaderboard()

const event = ref<any>(null)
const participants = ref<any[]>([])
const pairings = ref<any[]>([])
const leaderboardPreview = ref<any[]>([])
const isLoading = ref(false)
const isRegistering = ref(false)
const isGeneratingPairings = ref(false)
const showPairingDialog = ref(false)
const errorMessage = ref<string>('')
const successMessage = ref<string>('')
const isLoadingLeaderboard = ref(false)

const eventId = route.params.id as string

// Pairing configuration
const pairingConfig = ref({
  groupSize: 4,
  startTime: '08:00',
  interval: 10,
  shotgunStart: false
})

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
      course: eventData.course,
      teeBox: eventData.tee_box
    }

    await loadParticipants()
    await loadPairings()

    // Load leaderboard if event is in progress or completed
    if (event.value.status === 'in_progress' || event.value.status === 'completed') {
      await loadLeaderboardPreview()
    }
  } catch (error: any) {
    errorMessage.value = `Failed to load event: ${error.message}`
  } finally {
    isLoading.value = false
  }
}

// Load leaderboard preview (top 5)
const loadLeaderboardPreview = async () => {
  isLoadingLeaderboard.value = true
  try {
    const fullLeaderboard = await fetchEventLeaderboard(eventId, 'net')
    leaderboardPreview.value = fullLeaderboard.slice(0, 5)
  } catch (error: any) {
    console.error('Failed to load leaderboard preview:', error)
  } finally {
    isLoadingLeaderboard.value = false
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

// Load pairings
const loadPairings = async () => {
  try {
    const { data, error } = await supabase
      .from('event_pairings')
      .select(`
        *,
        members:pairing_members(
          *,
          user:profiles(id, first_name, last_name, current_handicap_index)
        )
      `)
      .eq('event_id', eventId)
      .order('group_number', { ascending: true })

    if (error) throw error

    pairings.value = (data || []).map((pairing: any) => ({
      id: pairing.id,
      groupNumber: pairing.group_number,
      teeTime: pairing.tee_time,
      startingHole: pairing.starting_hole,
      notes: pairing.notes,
      isFinalized: pairing.is_finalized,
      members: (pairing.members || []).map((member: any) => ({
        id: member.id,
        userId: member.user.id,
        firstName: member.user.first_name,
        lastName: member.user.last_name,
        handicapIndex: member.user.current_handicap_index,
        position: member.position
      })).sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
    }))
  } catch (error: any) {
    console.error('Failed to load pairings:', error)
  }
}

// Generate pairings
const generatePairings = async () => {
  if (!authStore.isAdmin) return

  isGeneratingPairings.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    // Delete existing pairings
    await supabase
      .from('event_pairings')
      .delete()
      .eq('event_id', eventId)

    // Shuffle participants for randomization
    const shuffled = [...participants.value].sort(() => Math.random() - 0.5)

    // Calculate number of groups
    const groupSize = pairingConfig.value.groupSize
    const numGroups = Math.ceil(shuffled.length / groupSize)

    // Generate tee times or starting holes
    const startHour = parseInt(pairingConfig.value.startTime.split(':')[0])
    const startMinute = parseInt(pairingConfig.value.startTime.split(':')[1])

    // Create pairings
    for (let i = 0; i < numGroups; i++) {
      const groupMembers = shuffled.slice(i * groupSize, (i + 1) * groupSize)

      // Calculate tee time or starting hole
      let teeTime = null
      let startingHole = 1

      if (pairingConfig.value.shotgunStart) {
        startingHole = (i % 18) + 1
      } else {
        const totalMinutes = startMinute + (i * pairingConfig.value.interval)
        const hours = startHour + Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        teeTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
      }

      // Insert pairing
      const { data: pairingData, error: pairingError } = await (supabase
        .from('event_pairings') as any)
        .insert({
          event_id: eventId,
          group_number: i + 1,
          tee_time: teeTime,
          starting_hole: startingHole,
          is_finalized: false
        })
        .select()
        .single()

      if (pairingError) throw pairingError

      // Insert pairing members
      const memberInserts = groupMembers.map((member, index) => ({
        pairing_id: (pairingData as any).id,
        user_id: member.userId,
        position: index + 1
      }))

      const { error: membersError } = await (supabase
        .from('pairing_members') as any)
        .insert(memberInserts)

      if (membersError) throw membersError
    }

    successMessage.value = `Successfully generated ${numGroups} groups!`
    showPairingDialog.value = false
    await loadPairings()

    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error: any) {
    errorMessage.value = `Failed to generate pairings: ${error.message}`
  } finally {
    isGeneratingPairings.value = false
  }
}

// Finalize pairings
const finalizePairings = async () => {
  if (!authStore.isAdmin) return

  if (!confirm('Are you sure you want to finalize the pairings? This will lock them from further changes.')) return

  try {
    const { error } = await (supabase
      .from('event_pairings') as any)
      .update({ is_finalized: true })
      .eq('event_id', eventId)

    if (error) throw error

    successMessage.value = 'Pairings have been finalized!'
    await loadPairings()

    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error: any) {
    errorMessage.value = `Failed to finalize pairings: ${error.message}`
  }
}

// Delete pairings
const deletePairings = async () => {
  if (!authStore.isAdmin) return

  if (!confirm('Are you sure you want to delete all pairings for this event?')) return

  try {
    const { error } = await supabase
      .from('event_pairings')
      .delete()
      .eq('event_id', eventId)

    if (error) throw error

    successMessage.value = 'Pairings have been deleted'
    pairings.value = []

    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error: any) {
    errorMessage.value = `Failed to delete pairings: ${error.message}`
  }
}

// Check if pairings are finalized
const arePairingsFinalized = computed(() => {
  return pairings.value.length > 0 && pairings.value.every(p => p.isFinalized)
})

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
          <div class="bg-white shadow rounded-lg overflow-hidden mb-6">
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

          <!-- Leaderboard Preview -->
          <div v-if="event.status === 'in_progress' || event.status === 'completed'" class="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex justify-between items-center">
                <h2 class="text-lg font-medium text-gray-900">
                  Leaderboard
                  <span v-if="event.status === 'in_progress'" class="ml-2 inline-flex items-center">
                    <span class="flex h-2 w-2 mr-2">
                      <span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span class="text-sm text-green-700 font-medium">Live</span>
                  </span>
                </h2>
                <button
                  @click="router.push(`/leaderboards/events/${eventId}`)"
                  class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
                >
                  View Full Leaderboard
                </button>
              </div>
            </div>
            <div class="px-6 py-4">
              <div v-if="isLoadingLeaderboard" class="text-center py-8 text-gray-500">
                Loading leaderboard...
              </div>
              <div v-else-if="leaderboardPreview.length === 0" class="text-center py-8 text-gray-500">
                No scores posted yet
              </div>
              <div v-else>
                <div class="space-y-3">
                  <div
                    v-for="entry in leaderboardPreview"
                    :key="entry.userId"
                    class="flex justify-between items-center py-3 border-b border-gray-100 last:border-0"
                  >
                    <div class="flex items-center space-x-4">
                      <div
                        :class="[
                          'flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm',
                          entry.position === 1 ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' :
                          entry.position === 2 ? 'bg-gray-100 text-gray-800 border-2 border-gray-300' :
                          entry.position === 3 ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' :
                          'bg-white text-gray-700 border-2 border-gray-200'
                        ]"
                      >
                        {{ entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : entry.position === 3 ? '🥉' : entry.position }}
                      </div>
                      <div>
                        <p class="font-medium text-gray-900">{{ entry.userName }}</p>
                        <p class="text-sm text-gray-500">Handicap: {{ entry.courseHandicap || '-' }}</p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="text-2xl font-bold text-primary-600">{{ entry.netScore }}</p>
                      <p class="text-sm text-gray-500">Gross: {{ entry.grossScore }}</p>
                    </div>
                  </div>
                </div>
                <div class="mt-4 text-center">
                  <button
                    @click="router.push(`/leaderboards/events/${eventId}`)"
                    class="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View Full Leaderboard →
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Pairings Section (Admin Only) -->
          <div v-if="authStore.isAdmin && participants.length > 0" class="bg-white shadow rounded-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex justify-between items-center">
                <h2 class="text-lg font-medium text-gray-900">
                  Event Pairings
                  <span v-if="arePairingsFinalized" class="ml-2 text-sm text-green-600">(Finalized)</span>
                </h2>
                <div class="flex space-x-3">
                  <button
                    v-if="pairings.length === 0"
                    @click="showPairingDialog = true"
                    class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700"
                  >
                    Generate Pairings
                  </button>
                  <template v-else>
                    <button
                      v-if="!arePairingsFinalized"
                      @click="finalizePairings"
                      class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                    >
                      Finalize Pairings
                    </button>
                    <button
                      @click="showPairingDialog = true"
                      class="px-4 py-2 border border-primary-600 text-primary-600 text-sm font-medium rounded-md hover:bg-primary-50"
                    >
                      Regenerate
                    </button>
                    <button
                      @click="deletePairings"
                      class="px-4 py-2 border border-red-600 text-red-600 text-sm font-medium rounded-md hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </template>
                </div>
              </div>
            </div>

            <div class="px-6 py-4">
              <div v-if="pairings.length === 0" class="text-center py-8 text-gray-500">
                No pairings generated yet. Click "Generate Pairings" to create groups.
              </div>
              <div v-else class="space-y-4">
                <div
                  v-for="pairing in pairings"
                  :key="pairing.id"
                  class="border border-gray-200 rounded-lg p-4"
                >
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <h3 class="font-semibold text-gray-900">
                        Group {{ pairing.groupNumber }}
                      </h3>
                      <p class="text-sm text-gray-600">
                        <span v-if="pairing.teeTime">
                          Tee Time: {{ formatTime(pairing.teeTime) }}
                        </span>
                        <span v-else>
                          Starting Hole: {{ pairing.startingHole }}
                        </span>
                      </p>
                    </div>
                    <span
                      v-if="pairing.isFinalized"
                      class="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded"
                    >
                      Finalized
                    </span>
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="member in pairing.members"
                      :key="member.id"
                      class="flex justify-between items-center py-2 border-t border-gray-100 first:border-0"
                    >
                      <span class="text-gray-900">
                        {{ member.firstName }} {{ member.lastName }}
                      </span>
                      <span class="text-sm text-gray-600">
                        HCP: {{ member.handicapIndex || '-' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pairing Configuration Dialog -->
          <div v-if="showPairingDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900">Generate Pairings</h3>
              </div>
              <div class="px-6 py-4 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Group Size
                  </label>
                  <select
                    v-model.number="pairingConfig.groupSize"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option :value="2">2 players per group</option>
                    <option :value="3">3 players per group</option>
                    <option :value="4">4 players per group</option>
                  </select>
                </div>

                <div>
                  <label class="flex items-center">
                    <input
                      v-model="pairingConfig.shotgunStart"
                      type="checkbox"
                      class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span class="ml-2 text-sm text-gray-700">Shotgun Start</span>
                  </label>
                  <p class="mt-1 text-xs text-gray-500">
                    Groups start on different holes simultaneously
                  </p>
                </div>

                <div v-if="!pairingConfig.shotgunStart">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    First Tee Time
                  </label>
                  <input
                    v-model="pairingConfig.startTime"
                    type="time"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div v-if="!pairingConfig.shotgunStart">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Interval Between Groups (minutes)
                  </label>
                  <input
                    v-model.number="pairingConfig.interval"
                    type="number"
                    min="5"
                    max="30"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p class="text-sm text-blue-800">
                    This will create {{ Math.ceil(participants.length / pairingConfig.groupSize) }} group(s)
                    with {{ participants.length }} total players.
                  </p>
                </div>
              </div>
              <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  @click="showPairingDialog = false"
                  class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  @click="generatePairings"
                  :disabled="isGeneratingPairings"
                  class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {{ isGeneratingPairings ? 'Generating...' : 'Generate' }}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>
