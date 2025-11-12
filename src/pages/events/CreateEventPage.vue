<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import type { Course, TeeBox } from '@/types/models'

const authStore = useAuthStore()
const router = useRouter()

// Redirect if not admin
if (!authStore.isAdmin) {
  router.push('/events')
}

const courses = ref<Course[]>([])
const teeBoxes = ref<TeeBox[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref<string>('')

// Form data
const formData = ref({
  name: '',
  description: '',
  eventDate: '',
  startTime: '',
  courseId: '',
  teeBoxId: '',
  scoringFormat: 'stroke' as 'stroke' | 'match' | 'stableford',
  eventType: 'individual' as 'individual' | 'team' | 'both',
  maxParticipants: null as number | null,
  status: 'scheduled' as 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
})

// Load courses
const loadCourses = async () => {
  isLoading.value = true

  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('name')

    if (error) throw error
    if (!data) return

    courses.value = data.map((course: any) => ({
      id: course.id,
      name: course.name,
      city: course.city,
      state: course.state,
      totalPar: course.total_par,
      createdAt: course.created_at,
      updatedAt: course.updated_at
    }))
  } catch (error: any) {
    errorMessage.value = `Failed to load courses: ${error.message}`
  } finally {
    isLoading.value = false
  }
}

// Load tee boxes
const loadTeeBoxes = async () => {
  try {
    const { data, error } = await supabase
      .from('tee_boxes')
      .select('*')

    if (error) throw error
    if (!data) return

    teeBoxes.value = data.map((tb: any) => ({
      id: tb.id,
      courseId: tb.course_id,
      name: tb.name,
      color: tb.color,
      courseRating: tb.course_rating,
      slopeRating: tb.slope_rating,
      totalYardage: tb.total_yardage,
      createdAt: tb.created_at
    }))
  } catch (error: any) {
    errorMessage.value = `Failed to load tee boxes: ${error.message}`
  }
}

// Get filtered tee boxes for selected course
const filteredTeeBoxes = () => {
  return teeBoxes.value.filter(tb => tb.courseId === formData.value.courseId)
}

// Create event
const createEvent = async () => {
  if (!authStore.user?.id) return

  isSaving.value = true
  errorMessage.value = ''

  try {
    const eventData: any = {
      name: formData.value.name,
      description: formData.value.description || null,
      event_date: formData.value.eventDate,
      start_time: formData.value.startTime || null,
      course_id: formData.value.courseId,
      tee_box_id: formData.value.teeBoxId,
      scoring_format: formData.value.scoringFormat,
      event_type: formData.value.eventType,
      is_team_event: formData.value.eventType === 'team' || formData.value.eventType === 'both',
      max_participants: formData.value.maxParticipants,
      status: formData.value.status,
      created_by: authStore.user.id
    }

    const { data, error } = await (supabase
      .from('events') as any)
      .insert(eventData)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Failed to create event')

    // Redirect to event detail page
    router.push(`/events/${(data as any).id}`)
  } catch (error: any) {
    errorMessage.value = `Failed to create event: ${error.message}`
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadCourses()
  loadTeeBoxes()
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
            <h1 class="text-2xl font-bold text-gray-900">Create Event</h1>
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

        <!-- Form Card -->
        <div class="bg-white shadow rounded-lg p-6">
          <form @submit.prevent="createEvent" class="space-y-6">

            <!-- Event Name -->
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                Event Name *
              </label>
              <input
                id="name"
                v-model="formData.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Monthly Tournament"
              />
            </div>

            <!-- Description -->
            <div>
              <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                v-model="formData.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Event details and information..."
              />
            </div>

            <!-- Date and Time -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label for="eventDate" class="block text-sm font-medium text-gray-700 mb-1">
                  Event Date *
                </label>
                <input
                  id="eventDate"
                  v-model="formData.eventDate"
                  type="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label for="startTime" class="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  id="startTime"
                  v-model="formData.startTime"
                  type="time"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <!-- Course and Tee Box -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label for="courseId" class="block text-sm font-medium text-gray-700 mb-1">
                  Course *
                </label>
                <select
                  id="courseId"
                  v-model="formData.courseId"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a course</option>
                  <option v-for="course in courses" :key="course.id" :value="course.id">
                    {{ course.name }}
                  </option>
                </select>
              </div>

              <div>
                <label for="teeBoxId" class="block text-sm font-medium text-gray-700 mb-1">
                  Tee Box *
                </label>
                <select
                  id="teeBoxId"
                  v-model="formData.teeBoxId"
                  :disabled="!formData.courseId"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                >
                  <option value="">Select a tee box</option>
                  <option v-for="teeBox in filteredTeeBoxes()" :key="teeBox.id" :value="teeBox.id">
                    {{ teeBox.name }} ({{ teeBox.color }})
                  </option>
                </select>
              </div>
            </div>

            <!-- Scoring Format and Event Type -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label for="scoringFormat" class="block text-sm font-medium text-gray-700 mb-1">
                  Scoring Format *
                </label>
                <select
                  id="scoringFormat"
                  v-model="formData.scoringFormat"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="stroke">Stroke Play</option>
                  <option value="match">Match Play</option>
                  <option value="stableford">Stableford</option>
                </select>
              </div>

              <div>
                <label for="eventType" class="block text-sm font-medium text-gray-700 mb-1">
                  Event Type *
                </label>
                <select
                  id="eventType"
                  v-model="formData.eventType"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="individual">Individual</option>
                  <option value="team">Team</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>

            <!-- Max Participants and Status -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label for="maxParticipants" class="block text-sm font-medium text-gray-700 mb-1">
                  Max Participants
                </label>
                <input
                  id="maxParticipants"
                  v-model.number="formData.maxParticipants"
                  type="number"
                  min="1"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div>
                <label for="status" class="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  id="status"
                  v-model="formData.status"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                @click="router.push('/events')"
                :disabled="isSaving"
                class="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isSaving"
                class="px-6 py-3 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
              >
                {{ isSaving ? 'Creating...' : 'Create Event' }}
              </button>
            </div>

          </form>
        </div>

      </div>
    </main>
  </div>
</template>
