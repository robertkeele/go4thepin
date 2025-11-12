<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

interface TeeBox {
  id: string
  name: string
  color: string
  course_rating: number
  slope_rating: number
  total_yardage: number
}

interface Hole {
  id: string
  hole_number: number
  par: number
  handicap_index: number
  yardage_blue: number | null
  yardage_white: number | null
  yardage_red: number | null
}

interface Course {
  id: string
  name: string
  city: string | null
  state: string | null
  total_par: number
  created_at: string
}

const courseId = route.params.id as string
const course = ref<Course | null>(null)
const teeBoxes = ref<TeeBox[]>([])
const holes = ref<Hole[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const isEditing = ref(false)
const saving = ref(false)

// Edit form data
const editForm = ref({
  name: '',
  city: '',
  state: '',
  total_par: 72
})

const frontNine = computed(() => holes.value.filter(h => h.hole_number <= 9))
const backNine = computed(() => holes.value.filter(h => h.hole_number > 9))

const frontNinePar = computed(() => frontNine.value.reduce((sum, hole) => sum + hole.par, 0))
const backNinePar = computed(() => backNine.value.reduce((sum, hole) => sum + hole.par, 0))

const fetchCourse = async () => {
  try {
    loading.value = true
    error.value = null

    // Fetch course
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()

    if (courseError) throw courseError

    course.value = courseData

    // Set edit form data
    editForm.value = {
      name: (courseData as any).name,
      city: (courseData as any).city || '',
      state: (courseData as any).state || '',
      total_par: (courseData as any).total_par
    }

    // Fetch tee boxes
    const { data: teeBoxData, error: teeBoxError } = await supabase
      .from('tee_boxes')
      .select('*')
      .eq('course_id', courseId)
      .order('course_rating', { ascending: false })

    if (teeBoxError) throw teeBoxError

    teeBoxes.value = teeBoxData || []

    // Fetch holes
    const { data: holesData, error: holesError } = await supabase
      .from('holes')
      .select('*')
      .eq('course_id', courseId)
      .order('hole_number')

    if (holesError) throw holesError

    holes.value = holesData || []
  } catch (err: any) {
    error.value = err.message
    console.error('Error fetching course:', err)
  } finally {
    loading.value = false
  }
}

const updateCourse = async () => {
  if (!course.value) return

  try {
    saving.value = true
    error.value = null

    const { error: updateError } = await supabase
      .from('courses')
      // @ts-ignore - Supabase v2.45.4 type inference limitation
      .update({
        name: editForm.value.name,
        city: editForm.value.city || null,
        state: editForm.value.state || null,
        total_par: editForm.value.total_par
      })
      .eq('id', courseId)

    if (updateError) throw updateError

    // Refresh data
    await fetchCourse()
    isEditing.value = false
  } catch (err: any) {
    error.value = err.message
    console.error('Error updating course:', err)
  } finally {
    saving.value = false
  }
}

const cancelEdit = () => {
  if (course.value) {
    editForm.value = {
      name: course.value.name,
      city: course.value.city || '',
      state: course.value.state || '',
      total_par: course.value.total_par
    }
  }
  isEditing.value = false
}

const deleteCourse = async () => {
  if (!course.value) return

  const confirmed = confirm(`Are you sure you want to delete "${course.value.name}"? This action cannot be undone.`)
  if (!confirmed) return

  try {
    loading.value = true

    const { error: deleteError } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)

    if (deleteError) throw deleteError

    router.push({ name: 'courses' })
  } catch (err: any) {
    error.value = err.message
    console.error('Error deleting course:', err)
    loading.value = false
  }
}

onMounted(() => {
  fetchCourse()
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
              @click="router.push({ name: 'courses' })"
              class="text-gray-600 hover:text-gray-900 mr-4"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 class="text-2xl font-bold text-gray-900">Course Details</h1>
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
              @click="router.push('/courses')"
              class="text-sm text-gray-700 hover:text-gray-900 font-medium"
            >
              Courses
            </button>
            <template v-if="authStore.isAdmin">
              <span class="text-gray-300">|</span>
              <button
                @click="router.push('/admin/users')"
                class="text-sm text-purple-700 hover:text-purple-900 font-medium"
              >
                Admin
              </button>
            </template>
          </div>
        </div>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Error Message -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
        {{ error }}
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-lg shadow-sm p-12 text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p class="mt-4 text-gray-600">Loading course...</p>
      </div>

      <div v-else-if="course">
        <!-- Course Header -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div v-if="!isEditing">
                <h1 class="text-3xl font-bold text-gray-900">{{ course.name }}</h1>
                <p class="mt-2 text-lg text-gray-600">
                  {{ course.city && course.state ? `${course.city}, ${course.state}` : course.city || course.state || 'Location not specified' }}
                </p>
                <div class="mt-4 flex items-center space-x-6">
                  <div>
                    <span class="text-sm text-gray-500">Total Par</span>
                    <p class="text-2xl font-semibold text-gray-900">{{ course.total_par }}</p>
                  </div>
                  <div>
                    <span class="text-sm text-gray-500">Holes</span>
                    <p class="text-2xl font-semibold text-gray-900">{{ holes.length }}</p>
                  </div>
                  <div>
                    <span class="text-sm text-gray-500">Tee Boxes</span>
                    <p class="text-2xl font-semibold text-gray-900">{{ teeBoxes.length }}</p>
                  </div>
                </div>
              </div>

              <!-- Edit Form -->
              <div v-else class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                  <input
                    v-model="editForm.name"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      v-model="editForm.city"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      v-model="editForm.state"
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Total Par</label>
                  <input
                    v-model.number="editForm.total_par"
                    type="number"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div v-if="authStore.isAdmin" class="ml-6 flex items-center space-x-3">
              <template v-if="!isEditing">
                <button
                  @click="isEditing = true"
                  class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Edit
                </button>
                <button
                  @click="deleteCourse"
                  class="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </template>
              <template v-else>
                <button
                  @click="updateCourse"
                  :disabled="saving"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {{ saving ? 'Saving...' : 'Save' }}
                </button>
                <button
                  @click="cancelEdit"
                  :disabled="saving"
                  class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
              </template>
            </div>
          </div>
        </div>

        <!-- Tee Boxes -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Tee Boxes</h2>
          <div v-if="teeBoxes.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="teeBox in teeBoxes"
              :key="teeBox.id"
              class="border border-gray-200 rounded-lg p-4"
            >
              <div class="flex items-center mb-3">
                <div
                  :class="['w-4 h-4 rounded-full mr-2']"
                  :style="{ backgroundColor: teeBox.color }"
                ></div>
                <h3 class="font-semibold text-gray-900">{{ teeBox.name }}</h3>
              </div>
              <div class="space-y-1 text-sm text-gray-600">
                <div class="flex justify-between">
                  <span>Rating:</span>
                  <span class="font-medium">{{ teeBox.course_rating }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Slope:</span>
                  <span class="font-medium">{{ teeBox.slope_rating }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Yardage:</span>
                  <span class="font-medium">{{ teeBox.total_yardage }} yds</span>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="text-gray-500">No tee boxes configured</p>
        </div>

        <!-- Holes Scorecard -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Scorecard</h2>

          <div v-if="holes.length > 0" class="space-y-6">
            <!-- Front Nine -->
            <div>
              <h3 class="text-lg font-medium text-gray-900 mb-3">Front Nine</h3>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hole</th>
                      <th v-for="hole in frontNine" :key="hole.id" class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                        {{ hole.hole_number }}
                      </th>
                      <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-gray-100">Out</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr>
                      <td class="px-3 py-2 text-sm font-medium text-gray-900">Par</td>
                      <td v-for="hole in frontNine" :key="'par-' + hole.id" class="px-3 py-2 text-sm text-center text-gray-900">
                        {{ hole.par }}
                      </td>
                      <td class="px-3 py-2 text-sm text-center font-semibold text-gray-900 bg-gray-50">{{ frontNinePar }}</td>
                    </tr>
                    <tr>
                      <td class="px-3 py-2 text-sm font-medium text-gray-900">HCP</td>
                      <td v-for="hole in frontNine" :key="'hcp-' + hole.id" class="px-3 py-2 text-sm text-center text-gray-600">
                        {{ hole.handicap_index }}
                      </td>
                      <td class="px-3 py-2 bg-gray-50"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Back Nine -->
            <div>
              <h3 class="text-lg font-medium text-gray-900 mb-3">Back Nine</h3>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hole</th>
                      <th v-for="hole in backNine" :key="hole.id" class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                        {{ hole.hole_number }}
                      </th>
                      <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-gray-100">In</th>
                      <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-primary-100">Total</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr>
                      <td class="px-3 py-2 text-sm font-medium text-gray-900">Par</td>
                      <td v-for="hole in backNine" :key="'par-' + hole.id" class="px-3 py-2 text-sm text-center text-gray-900">
                        {{ hole.par }}
                      </td>
                      <td class="px-3 py-2 text-sm text-center font-semibold text-gray-900 bg-gray-50">{{ backNinePar }}</td>
                      <td class="px-3 py-2 text-sm text-center font-bold text-gray-900 bg-primary-50">{{ course.total_par }}</td>
                    </tr>
                    <tr>
                      <td class="px-3 py-2 text-sm font-medium text-gray-900">HCP</td>
                      <td v-for="hole in backNine" :key="'hcp-' + hole.id" class="px-3 py-2 text-sm text-center text-gray-600">
                        {{ hole.handicap_index }}
                      </td>
                      <td class="px-3 py-2 bg-gray-50"></td>
                      <td class="px-3 py-2 bg-primary-50"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p v-else class="text-gray-500">No holes configured</p>
        </div>
      </div>
    </div>
  </div>
</template>
