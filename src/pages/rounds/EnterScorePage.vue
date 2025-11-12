<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import type { Course, TeeBox, Hole } from '@/types/models'

const authStore = useAuthStore()
const router = useRouter()

// Form state
const selectedCourseId = ref<string>('')
const selectedTeeBoxId = ref<string>('')
const playedDate = ref<string>(new Date().toISOString().split('T')[0])
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref<string>('')
const successMessage = ref<string>('')

// Data
const courses = ref<Course[]>([])
const teeBoxes = ref<TeeBox[]>([])
const holes = ref<Hole[]>([])

// Score entry for each hole
interface HoleScore {
  holeId: string
  holeNumber: number
  par: number
  strokes: number
  putts: number | null
  fairwayHit: boolean | null
  gir: boolean | null
}

const holeScores = ref<HoleScore[]>([])

// Computed
const selectedCourse = computed(() =>
  courses.value.find(c => c.id === selectedCourseId.value)
)

const filteredTeeBoxes = computed(() =>
  teeBoxes.value.filter(tb => tb.courseId === selectedCourseId.value)
)

const totalScore = computed(() =>
  holeScores.value.reduce((sum, hs) => sum + (hs.strokes || 0), 0)
)

const totalPar = computed(() =>
  holeScores.value.reduce((sum, hs) => sum + hs.par, 0)
)

const scoreToPar = computed(() => {
  const diff = totalScore.value - totalPar.value
  if (diff === 0) return 'E'
  if (diff > 0) return `+${diff}`
  return diff.toString()
})

// Load courses
const loadCourses = async () => {
  isLoading.value = true
  errorMessage.value = ''

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

// Load tee boxes for all courses
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

// Load holes when course is selected
const loadHoles = async () => {
  if (!selectedCourseId.value) return

  try {
    const { data, error } = await supabase
      .from('holes')
      .select('*')
      .eq('course_id', selectedCourseId.value)
      .order('hole_number')

    if (error) throw error
    if (!data) return

    holes.value = data.map((hole: any) => ({
      id: hole.id,
      courseId: hole.course_id,
      holeNumber: hole.hole_number,
      par: hole.par,
      handicapIndex: hole.handicap_index,
      yardageBlue: hole.yardage_blue,
      yardageWhite: hole.yardage_white,
      yardageRed: hole.yardage_red
    }))

    // Initialize hole scores
    holeScores.value = holes.value.map(hole => ({
      holeId: hole.id,
      holeNumber: hole.holeNumber,
      par: hole.par,
      strokes: hole.par, // Default to par
      putts: null,
      fairwayHit: null,
      gir: null
    }))
  } catch (error: any) {
    errorMessage.value = `Failed to load holes: ${error.message}`
  }
}

// Handle course selection
const handleCourseChange = () => {
  selectedTeeBoxId.value = ''
  holeScores.value = []
  loadHoles()
}

// Save round
const saveRound = async () => {
  if (!selectedCourseId.value || !selectedTeeBoxId.value || !playedDate.value) {
    errorMessage.value = 'Please select a course, tee box, and date'
    return
  }

  if (holeScores.value.length !== 18) {
    errorMessage.value = 'Please complete all 18 holes'
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (!authStore.user?.id) {
      throw new Error('User not authenticated')
    }

    // Create the round
    const roundInsertData: any = {
      user_id: authStore.user.id,
      course_id: selectedCourseId.value,
      tee_box_id: selectedTeeBoxId.value,
      played_date: playedDate.value,
      total_score: totalScore.value,
      is_posted_for_handicap: false
    }

    const { data: roundData, error: roundError } = await supabase
      .from('rounds')
      .insert(roundInsertData)
      .select()
      .single()

    if (roundError) throw roundError
    if (!roundData) throw new Error('Failed to create round')

    // Create hole-by-hole scores
    const scoresData: any = holeScores.value.map(hs => ({
      round_id: (roundData as any).id,
      hole_id: hs.holeId,
      strokes: hs.strokes,
      putts: hs.putts,
      fairway_hit: hs.fairwayHit,
      gir: hs.gir
    }))

    const { error: scoresError } = await supabase
      .from('scores')
      .insert(scoresData)

    if (scoresError) throw scoresError

    successMessage.value = 'Round saved successfully!'

    // Redirect to rounds history after a short delay
    setTimeout(() => {
      router.push('/rounds/history')
    }, 1500)

  } catch (error: any) {
    errorMessage.value = `Failed to save round: ${error.message}`
  } finally {
    isSaving.value = false
  }
}

// Initialize
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
              @click="router.push('/dashboard')"
              class="text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <h1 class="text-2xl font-bold text-gray-900">Enter Score</h1>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">

        <!-- Error Message -->
        <div v-if="errorMessage" class="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-sm text-red-700">{{ errorMessage }}</p>
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <p class="text-sm text-green-700">{{ successMessage }}</p>
        </div>

        <!-- Round Details Form -->
        <div class="bg-white shadow rounded-lg p-6 mb-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Round Details</h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Course Selection -->
            <div>
              <label for="course" class="block text-sm font-medium text-gray-700 mb-1">
                Course
              </label>
              <select
                id="course"
                v-model="selectedCourseId"
                @change="handleCourseChange"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                :disabled="isLoading"
              >
                <option value="">Select a course</option>
                <option v-for="course in courses" :key="course.id" :value="course.id">
                  {{ course.name }}
                </option>
              </select>
            </div>

            <!-- Tee Box Selection -->
            <div>
              <label for="teebox" class="block text-sm font-medium text-gray-700 mb-1">
                Tee Box
              </label>
              <select
                id="teebox"
                v-model="selectedTeeBoxId"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                :disabled="!selectedCourseId"
              >
                <option value="">Select a tee box</option>
                <option v-for="teeBox in filteredTeeBoxes" :key="teeBox.id" :value="teeBox.id">
                  {{ teeBox.name }} ({{ teeBox.color }})
                </option>
              </select>
            </div>

            <!-- Date -->
            <div>
              <label for="date" class="block text-sm font-medium text-gray-700 mb-1">
                Date Played
              </label>
              <input
                id="date"
                v-model="playedDate"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        <!-- Score Entry -->
        <div v-if="holeScores.length > 0" class="bg-white shadow rounded-lg p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-medium text-gray-900">Hole-by-Hole Scores</h2>
            <div class="text-right">
              <div class="text-2xl font-bold text-gray-900">
                {{ totalScore }}
              </div>
              <div class="text-sm text-gray-600">
                {{ scoreToPar }}
              </div>
            </div>
          </div>

          <!-- Score Grid -->
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hole</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Par</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Putts</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fairway</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">GIR</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="(holeScore, index) in holeScores" :key="holeScore.holeId">
                  <td class="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ holeScore.holeNumber }}
                  </td>
                  <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                    {{ holeScore.par }}
                  </td>
                  <td class="px-3 py-3 whitespace-nowrap">
                    <input
                      v-model.number="holeScore.strokes"
                      type="number"
                      min="1"
                      max="15"
                      class="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                  <td class="px-3 py-3 whitespace-nowrap">
                    <input
                      v-model.number="holeScore.putts"
                      type="number"
                      min="0"
                      max="10"
                      placeholder="-"
                      class="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                  <td class="px-3 py-3 whitespace-nowrap">
                    <input
                      v-model="holeScore.fairwayHit"
                      type="checkbox"
                      class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </td>
                  <td class="px-3 py-3 whitespace-nowrap">
                    <input
                      v-model="holeScore.gir"
                      type="checkbox"
                      class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-gray-50">
                <tr>
                  <td colspan="2" class="px-3 py-3 text-sm font-medium text-gray-900">Total</td>
                  <td class="px-3 py-3 text-sm font-bold text-gray-900">{{ totalScore }}</td>
                  <td colspan="3"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Save Button -->
          <div class="mt-6 flex justify-end">
            <button
              @click="saveRound"
              :disabled="isSaving || !selectedCourseId || !selectedTeeBoxId"
              class="px-6 py-3 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ isSaving ? 'Saving...' : 'Save Round' }}
            </button>
          </div>
        </div>

        <!-- No holes message -->
        <div v-else-if="selectedCourseId" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p class="text-sm text-blue-700">
            Select a tee box to begin entering your scores
          </p>
        </div>

      </div>
    </main>
  </div>
</template>
