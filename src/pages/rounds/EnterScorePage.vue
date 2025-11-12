<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useHandicap } from '@/composables/useHandicap'
import type { Course, TeeBox, Hole } from '@/types/models'

const authStore = useAuthStore()
const router = useRouter()
const { postRoundForHandicap } = useHandicap()

// Draft state
const DRAFT_KEY = 'golf-score-entry-draft'
const showDraftBanner = ref(false)
const hasSavedDraft = ref(false)

// Form state
const selectedCourseId = ref<string>('')
const selectedTeeBoxId = ref<string>('')
const playedDate = ref<string>(new Date().toISOString().split('T')[0])
const postForHandicap = ref<boolean>(true)
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

// Validation
interface ValidationWarning {
  holeNumber: number
  message: string
  type: 'warning' | 'error'
}

const validationWarnings = computed<ValidationWarning[]>(() => {
  const warnings: ValidationWarning[] = []

  holeScores.value.forEach(hs => {
    // Check if score is too low
    if (hs.strokes < 1) {
      warnings.push({
        holeNumber: hs.holeNumber,
        message: `Hole ${hs.holeNumber}: Score must be at least 1`,
        type: 'error'
      })
    }

    // Check if score is too high
    if (hs.strokes > 15) {
      warnings.push({
        holeNumber: hs.holeNumber,
        message: `Hole ${hs.holeNumber}: Score cannot exceed 15`,
        type: 'error'
      })
    }

    // Check if putts exceed strokes
    if (hs.putts !== null && hs.putts > hs.strokes) {
      warnings.push({
        holeNumber: hs.holeNumber,
        message: `Hole ${hs.holeNumber}: Putts (${hs.putts}) cannot exceed total strokes (${hs.strokes})`,
        type: 'error'
      })
    }

    // Warning for unusually high scores (5+ over par)
    if (hs.strokes >= hs.par + 5) {
      warnings.push({
        holeNumber: hs.holeNumber,
        message: `Hole ${hs.holeNumber}: Score is ${hs.strokes - hs.par} over par`,
        type: 'warning'
      })
    }

    // Warning for too many putts
    if (hs.putts !== null && hs.putts > 5) {
      warnings.push({
        holeNumber: hs.holeNumber,
        message: `Hole ${hs.holeNumber}: ${hs.putts} putts seems high`,
        type: 'warning'
      })
    }
  })

  return warnings
})

const hasErrors = computed(() =>
  validationWarnings.value.some(w => w.type === 'error')
)

// Get score color for visual feedback
const getScoreColor = (strokes: number, par: number): string => {
  const diff = strokes - par
  if (diff <= -2) return 'text-yellow-600 font-bold' // Eagle or better
  if (diff === -1) return 'text-blue-600 font-semibold' // Birdie
  if (diff === 0) return 'text-green-600' // Par
  if (diff === 1) return 'text-gray-700' // Bogey
  if (diff === 2) return 'text-orange-600' // Double bogey
  return 'text-red-600 font-semibold' // Triple or worse
}

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

// Draft management
const saveDraft = () => {
  if (!selectedCourseId.value) return

  const draft = {
    selectedCourseId: selectedCourseId.value,
    selectedTeeBoxId: selectedTeeBoxId.value,
    playedDate: playedDate.value,
    postForHandicap: postForHandicap.value,
    holeScores: holeScores.value,
    timestamp: new Date().toISOString()
  }

  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  hasSavedDraft.value = true
}

const loadDraft = () => {
  const savedDraft = localStorage.getItem(DRAFT_KEY)
  if (!savedDraft) return null

  try {
    return JSON.parse(savedDraft)
  } catch {
    return null
  }
}

const restoreDraft = async () => {
  const draft = loadDraft()
  if (!draft) return

  selectedCourseId.value = draft.selectedCourseId
  selectedTeeBoxId.value = draft.selectedTeeBoxId || ''
  playedDate.value = draft.playedDate || new Date().toISOString().split('T')[0]
  postForHandicap.value = draft.postForHandicap !== undefined ? draft.postForHandicap : true

  // Load holes for the selected course
  await loadHoles()

  // Restore hole scores
  if (draft.holeScores && draft.holeScores.length > 0) {
    holeScores.value = draft.holeScores
  }

  showDraftBanner.value = false
  hasSavedDraft.value = true
}

const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY)
  showDraftBanner.value = false
  hasSavedDraft.value = false
}

const dismissDraftBanner = () => {
  showDraftBanner.value = false
}

// Watch for changes and auto-save draft
watch(
  [selectedCourseId, selectedTeeBoxId, playedDate, postForHandicap, holeScores],
  () => {
    saveDraft()
  },
  { deep: true }
)

// Get selected tee box data
const selectedTeeBox = computed(() =>
  teeBoxes.value.find(tb => tb.id === selectedTeeBoxId.value)
)

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

  // Check for validation errors
  if (hasErrors.value) {
    errorMessage.value = 'Please fix the errors before saving'
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

    const { data: roundData, error: roundError } = await (supabase
      .from('rounds') as any)
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

    const { error: scoresError } = await (supabase
      .from('scores') as any)
      .insert(scoresData)

    if (scoresError) throw scoresError

    // Post for handicap if checked
    if (postForHandicap.value && selectedTeeBox.value) {
      const holeStrokesArray = holeScores.value.map(hs => hs.strokes)
      const holeParsArray = holeScores.value.map(hs => hs.par)

      await postRoundForHandicap(
        (roundData as any).id,
        authStore.user.id,
        holeStrokesArray,
        holeParsArray,
        selectedTeeBox.value.courseRating,
        selectedTeeBox.value.slopeRating,
        totalScore.value
      )
    }

    successMessage.value = postForHandicap.value
      ? 'Round saved and posted for handicap!'
      : 'Round saved successfully!'

    // Clear the draft after successful save
    clearDraft()

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

  // Check for saved draft
  const draft = loadDraft()
  if (draft) {
    showDraftBanner.value = true
  }
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

        <!-- Draft Restore Banner -->
        <div v-if="showDraftBanner" class="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-sm font-medium text-blue-800">Saved Draft Found</h3>
              <p class="mt-1 text-sm text-blue-700">
                You have an unfinished score entry. Would you like to restore it?
              </p>
              <div class="mt-3 flex space-x-3">
                <button
                  @click="restoreDraft"
                  class="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                >
                  Restore Draft
                </button>
                <button
                  @click="clearDraft"
                  class="px-3 py-1.5 bg-white text-blue-700 text-sm font-medium rounded border border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  Start Fresh
                </button>
                <button
                  @click="dismissDraftBanner"
                  class="px-3 py-1.5 text-blue-700 text-sm font-medium hover:text-blue-800 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              @click="dismissDraftBanner"
              class="ml-4 text-blue-500 hover:text-blue-700"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

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

          <!-- Post for Handicap -->
          <div class="mt-4">
            <label class="flex items-center">
              <input
                v-model="postForHandicap"
                type="checkbox"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span class="ml-2 text-sm text-gray-700">
                Post this round for handicap calculation
              </span>
            </label>
            <p class="mt-1 text-xs text-gray-500">
              Your round will be used to calculate your USGA Handicap Index
            </p>
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

          <!-- Validation Messages -->
          <div v-if="validationWarnings.length > 0" class="mb-4">
            <div v-for="warning in validationWarnings" :key="`${warning.holeNumber}-${warning.message}`"
              :class="[
                'mb-2 p-3 rounded-lg text-sm',
                warning.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              ]"
            >
              <span v-if="warning.type === 'error'" class="font-medium">Error: </span>
              <span v-else class="font-medium">Warning: </span>
              {{ warning.message }}
            </div>
          </div>

          <!-- Score Legend -->
          <div class="mb-4 flex flex-wrap gap-4 text-xs">
            <div class="flex items-center">
              <span class="text-yellow-600 font-bold mr-1">■</span>
              <span class="text-gray-600">Eagle or better</span>
            </div>
            <div class="flex items-center">
              <span class="text-blue-600 font-semibold mr-1">■</span>
              <span class="text-gray-600">Birdie</span>
            </div>
            <div class="flex items-center">
              <span class="text-green-600 mr-1">■</span>
              <span class="text-gray-600">Par</span>
            </div>
            <div class="flex items-center">
              <span class="text-gray-700 mr-1">■</span>
              <span class="text-gray-600">Bogey</span>
            </div>
            <div class="flex items-center">
              <span class="text-orange-600 mr-1">■</span>
              <span class="text-gray-600">Double</span>
            </div>
            <div class="flex items-center">
              <span class="text-red-600 font-semibold mr-1">■</span>
              <span class="text-gray-600">Triple+</span>
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
                      :class="[
                        'w-16 px-2 py-1 border rounded text-center focus:outline-none focus:ring-2 focus:ring-primary-500',
                        getScoreColor(holeScore.strokes, holeScore.par),
                        holeScore.strokes < 1 || holeScore.strokes > 15 ? 'border-red-500' : 'border-gray-300'
                      ]"
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

          <!-- Save and Clear Draft Buttons -->
          <div class="mt-6 flex justify-between items-center">
            <button
              v-if="hasSavedDraft"
              @click="clearDraft"
              class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Draft
            </button>
            <div v-else></div>
            <button
              @click="saveRound"
              :disabled="isSaving || !selectedCourseId || !selectedTeeBoxId || hasErrors"
              :class="[
                'px-6 py-3 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors',
                hasErrors
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700',
                (isSaving || !selectedCourseId || !selectedTeeBoxId) ? 'opacity-50 cursor-not-allowed' : ''
              ]"
            >
              {{ isSaving ? 'Saving...' : hasErrors ? 'Fix Errors to Save' : 'Save Round' }}
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
