<script setup lang="ts">
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

// Redirect if not admin
if (!authStore.isAdmin) {
  router.push('/dashboard')
}

const currentStep = ref(1)
const saving = ref(false)
const error = ref<string | null>(null)

// Course basic info
const courseForm = ref({
  name: '',
  city: '',
  state: '',
  total_par: 72
})

// Holes data
interface HoleData {
  hole_number: number
  par: number
  handicap_index: number
  yardage_blue: number
  yardage_white: number
  yardage_red: number
}

const holes = ref<HoleData[]>(
  Array.from({ length: 18 }, (_, i) => ({
    hole_number: i + 1,
    par: 4,
    handicap_index: i + 1,
    yardage_blue: 400,
    yardage_white: 375,
    yardage_red: 325
  }))
)

// Tee boxes data
interface TeeBoxData {
  name: string
  color: string
  course_rating: number
  slope_rating: number
  total_yardage: number
}

const teeBoxes = ref<TeeBoxData[]>([
  { name: 'Championship', color: '#1e3a8a', course_rating: 72.5, slope_rating: 130, total_yardage: 7000 },
  { name: 'Men', color: '#ffffff', course_rating: 70.0, slope_rating: 125, total_yardage: 6500 },
  { name: 'Women', color: '#dc2626', course_rating: 68.0, slope_rating: 120, total_yardage: 5800 }
])

const totalPar = computed(() => {
  return holes.value.reduce((sum, hole) => sum + hole.par, 0)
})

const frontNine = computed(() => holes.value.slice(0, 9))
const backNine = computed(() => holes.value.slice(9, 18))

const frontNinePar = computed(() => frontNine.value.reduce((sum, hole) => sum + hole.par, 0))
const backNinePar = computed(() => backNine.value.reduce((sum, hole) => sum + hole.par, 0))

const canProceedToStep2 = computed(() => {
  return courseForm.value.name.trim() !== ''
})

const canProceedToStep3 = computed(() => {
  return holes.value.every(hole => hole.par > 0 && hole.par <= 6)
})

const addTeeBox = () => {
  teeBoxes.value.push({
    name: '',
    color: '#000000',
    course_rating: 70.0,
    slope_rating: 113,
    total_yardage: 6000
  })
}

const removeTeeBox = (index: number) => {
  if (teeBoxes.value.length > 1) {
    teeBoxes.value.splice(index, 1)
  }
}

const updateTotalPar = () => {
  courseForm.value.total_par = totalPar.value
}

const createCourse = async () => {
  try {
    saving.value = true
    error.value = null

    // Create course
    const { data: courseData, error: courseError } = await (supabase
      .from('courses') as any)
      .insert({
        name: courseForm.value.name,
        city: courseForm.value.city || null,
        state: courseForm.value.state || null,
        total_par: totalPar.value
      })
      .select()
      .single()

    if (courseError) throw courseError

    const courseId = (courseData as any).id

    // Create holes
    const holesData = holes.value.map(hole => ({
      course_id: courseId,
      hole_number: hole.hole_number,
      par: hole.par,
      handicap_index: hole.handicap_index,
      yardage_blue: hole.yardage_blue,
      yardage_white: hole.yardage_white,
      yardage_red: hole.yardage_red
    }))

    const { error: holesError } = await (supabase
      .from('holes') as any)
      .insert(holesData)

    if (holesError) throw holesError

    // Create tee boxes
    const teeBoxesData = teeBoxes.value.map(teeBox => ({
      course_id: courseId,
      name: teeBox.name,
      color: teeBox.color,
      course_rating: teeBox.course_rating,
      slope_rating: teeBox.slope_rating,
      total_yardage: teeBox.total_yardage
    }))

    const { error: teeBoxesError } = await (supabase
      .from('tee_boxes') as any)
      .insert(teeBoxesData)

    if (teeBoxesError) throw teeBoxesError

    // Navigate to course detail
    router.push({ name: 'course-detail', params: { id: courseId } })
  } catch (err: any) {
    error.value = err.message
    console.error('Error creating course:', err)
  } finally {
    saving.value = false
  }
}

const nextStep = () => {
  if (currentStep.value < 3) {
    if (currentStep.value === 2) {
      updateTotalPar()
    }
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Back Button -->
      <button
        @click="router.push({ name: 'courses' })"
        class="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Courses
      </button>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Create New Course</h1>
        <p class="mt-2 text-sm text-gray-600">
          Add a new golf course to the system
        </p>
      </div>

      <!-- Progress Steps -->
      <div class="mb-8">
        <nav aria-label="Progress">
          <ol class="flex items-center">
            <li class="relative pr-8 sm:pr-20 flex-1">
              <div class="absolute inset-0 flex items-center" aria-hidden="true">
                <div :class="['h-0.5 w-full', currentStep > 1 ? 'bg-primary-600' : 'bg-gray-200']"></div>
              </div>
              <div :class="['relative flex h-8 w-8 items-center justify-center rounded-full', currentStep >= 1 ? 'bg-primary-600' : 'bg-gray-200']">
                <span class="text-white text-sm font-semibold">1</span>
              </div>
              <div class="mt-2 text-sm font-medium text-gray-900">Basic Info</div>
            </li>
            <li class="relative pr-8 sm:pr-20 flex-1">
              <div class="absolute inset-0 flex items-center" aria-hidden="true">
                <div :class="['h-0.5 w-full', currentStep > 2 ? 'bg-primary-600' : 'bg-gray-200']"></div>
              </div>
              <div :class="['relative flex h-8 w-8 items-center justify-center rounded-full', currentStep >= 2 ? 'bg-primary-600' : 'bg-gray-200']">
                <span class="text-white text-sm font-semibold">2</span>
              </div>
              <div class="mt-2 text-sm font-medium text-gray-900">Holes</div>
            </li>
            <li class="relative flex-1">
              <div :class="['relative flex h-8 w-8 items-center justify-center rounded-full', currentStep >= 3 ? 'bg-primary-600' : 'bg-gray-200']">
                <span class="text-white text-sm font-semibold">3</span>
              </div>
              <div class="mt-2 text-sm font-medium text-gray-900">Tee Boxes</div>
            </li>
          </ol>
        </nav>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
        {{ error }}
      </div>

      <!-- Step 1: Basic Info -->
      <div v-if="currentStep === 1" class="bg-white rounded-lg shadow-sm p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Course Information</h2>
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Course Name <span class="text-red-500">*</span>
            </label>
            <input
              v-model="courseForm.name"
              type="text"
              required
              placeholder="e.g., Pebble Beach Golf Links"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                v-model="courseForm.city"
                type="text"
                placeholder="e.g., Pebble Beach"
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">State</label>
              <input
                v-model="courseForm.state"
                type="text"
                placeholder="e.g., CA"
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Holes -->
      <div v-if="currentStep === 2" class="bg-white rounded-lg shadow-sm p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Configure Holes</h2>

        <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm text-blue-800">
            <strong>Current Total Par: {{ totalPar }}</strong>
            <span class="ml-4">Front 9: {{ frontNinePar }}</span>
            <span class="ml-4">Back 9: {{ backNinePar }}</span>
          </p>
        </div>

        <!-- Front Nine -->
        <div class="mb-8">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Front Nine</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hole</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Par</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">HCP</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Blue</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">White</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Red</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="hole in frontNine" :key="hole.hole_number">
                  <td class="px-3 py-2 text-sm font-medium text-gray-900">{{ hole.hole_number }}</td>
                  <td class="px-3 py-2">
                    <input v-model.number="hole.par" type="number" min="3" max="6" class="w-16 px-2 py-1 text-sm border border-gray-300 rounded" />
                  </td>
                  <td class="px-3 py-2">
                    <input v-model.number="hole.handicap_index" type="number" min="1" max="18" class="w-16 px-2 py-1 text-sm border border-gray-300 rounded" />
                  </td>
                  <td class="px-3 py-2">
                    <input v-model.number="hole.yardage_blue" type="number" min="0" class="w-20 px-2 py-1 text-sm border border-gray-300 rounded" />
                  </td>
                  <td class="px-3 py-2">
                    <input v-model.number="hole.yardage_white" type="number" min="0" class="w-20 px-2 py-1 text-sm border border-gray-300 rounded" />
                  </td>
                  <td class="px-3 py-2">
                    <input v-model.number="hole.yardage_red" type="number" min="0" class="w-20 px-2 py-1 text-sm border border-gray-300 rounded" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Back Nine -->
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4">Back Nine</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hole</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Par</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">HCP</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Blue</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">White</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Red</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="hole in backNine" :key="hole.hole_number">
                  <td class="px-3 py-2 text-sm font-medium text-gray-900">{{ hole.hole_number }}</td>
                  <td class="px-3 py-2">
                    <input v-model.number="hole.par" type="number" min="3" max="6" class="w-16 px-2 py-1 text-sm border border-gray-300 rounded" />
                  </td>
                  <td class="px-3 py-2">
                    <input v-model.number="hole.handicap_index" type="number" min="1" max="18" class="w-16 px-2 py-1 text-sm border border-gray-300 rounded" />
                  </td>
                  <td class="px-3 py-2">
                    <input v-model.number="hole.yardage_blue" type="number" min="0" class="w-20 px-2 py-1 text-sm border border-gray-300 rounded" />
                  </td>
                  <td class="px-3 py-2">
                    <input v-model.number="hole.yardage_white" type="number" min="0" class="w-20 px-2 py-1 text-sm border border-gray-300 rounded" />
                  </td>
                  <td class="px-3 py-2">
                    <input v-model.number="hole.yardage_red" type="number" min="0" class="w-20 px-2 py-1 text-sm border border-gray-300 rounded" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Step 3: Tee Boxes -->
      <div v-if="currentStep === 3" class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold text-gray-900">Configure Tee Boxes</h2>
          <button
            @click="addTeeBox"
            class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
          >
            <svg class="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Tee Box
          </button>
        </div>

        <div class="space-y-6">
          <div
            v-for="(teeBox, index) in teeBoxes"
            :key="index"
            class="border border-gray-200 rounded-lg p-4"
          >
            <div class="flex justify-between items-start mb-4">
              <h3 class="font-medium text-gray-900">Tee Box {{ index + 1 }}</h3>
              <button
                v-if="teeBoxes.length > 1"
                @click="removeTeeBox(index)"
                class="text-red-600 hover:text-red-800"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  v-model="teeBox.name"
                  type="text"
                  placeholder="e.g., Championship"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div class="flex items-center space-x-2">
                  <input
                    v-model="teeBox.color"
                    type="color"
                    class="h-10 w-20 border border-gray-300 rounded-md"
                  />
                  <input
                    v-model="teeBox.color"
                    type="text"
                    placeholder="#000000"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Course Rating</label>
                <input
                  v-model.number="teeBox.course_rating"
                  type="number"
                  step="0.1"
                  min="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Slope Rating</label>
                <input
                  v-model.number="teeBox.slope_rating"
                  type="number"
                  min="55"
                  max="155"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Total Yardage</label>
                <input
                  v-model.number="teeBox.total_yardage"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="mt-8 flex justify-between">
        <button
          v-if="currentStep > 1"
          @click="prevStep"
          class="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>
        <div v-else></div>

        <button
          v-if="currentStep < 3"
          @click="nextStep"
          :disabled="(currentStep === 1 && !canProceedToStep2) || (currentStep === 2 && !canProceedToStep3)"
          class="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <svg class="h-5 w-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          v-else
          @click="createCourse"
          :disabled="saving"
          class="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          <svg v-if="!saving" class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <div v-else class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          {{ saving ? 'Creating Course...' : 'Create Course' }}
        </button>
      </div>
    </div>
  </div>
</template>
