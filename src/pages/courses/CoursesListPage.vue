<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

interface Course {
  id: string
  name: string
  city: string | null
  state: string | null
  total_par: number
  created_at: string
  tee_box_count?: number
}

const courses = ref<Course[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const fetchCourses = async () => {
  try {
    loading.value = true
    error.value = null

    // Fetch courses with tee box counts
    const { data, error: fetchError } = await supabase
      .from('courses')
      .select('*, tee_boxes(count)')
      .order('name')

    if (fetchError) throw fetchError

    courses.value = (data || []).map((course: any) => ({
      id: course.id,
      name: course.name,
      city: course.city,
      state: course.state,
      total_par: course.total_par,
      created_at: course.created_at,
      tee_box_count: course.tee_boxes?.[0]?.count || 0
    }))
  } catch (err: any) {
    error.value = err.message
    console.error('Error fetching courses:', err)
  } finally {
    loading.value = false
  }
}

const viewCourse = (courseId: string) => {
  router.push({ name: 'course-detail', params: { id: courseId } })
}

const createCourse = () => {
  router.push({ name: 'create-course' })
}

const getLocationDisplay = (course: Course) => {
  if (course.city && course.state) {
    return `${course.city}, ${course.state}`
  } else if (course.city) {
    return course.city
  } else if (course.state) {
    return course.state
  }
  return 'Location not specified'
}

onMounted(() => {
  fetchCourses()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Golf Courses</h1>
          <p class="mt-2 text-sm text-gray-600">
            Browse all available golf courses
          </p>
        </div>
        <button
          v-if="authStore.isAdmin"
          @click="createCourse"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Course
        </button>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
        {{ error }}
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-lg shadow-sm p-12 text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p class="mt-4 text-gray-600">Loading courses...</p>
      </div>

      <!-- Courses Grid -->
      <div v-else-if="courses.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="course in courses"
          :key="course.id"
          @click="viewCourse(course.id)"
          class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
        >
          <!-- Course Image Placeholder -->
          <div class="h-48 bg-gradient-to-br from-golf-green to-golf-fairway flex items-center justify-center">
            <svg class="h-16 w-16 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
          </div>

          <!-- Course Info -->
          <div class="p-6">
            <h3 class="text-xl font-semibold text-gray-900 mb-2">
              {{ course.name }}
            </h3>

            <div class="space-y-2 mb-4">
              <div class="flex items-center text-sm text-gray-600">
                <svg class="h-5 w-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {{ getLocationDisplay(course) }}
              </div>

              <div class="flex items-center text-sm text-gray-600">
                <svg class="h-5 w-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                Par {{ course.total_par }}
              </div>

              <div class="flex items-center text-sm text-gray-600">
                <svg class="h-5 w-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {{ course.tee_box_count }} Tee Box{{ course.tee_box_count !== 1 ? 'es' : '' }}
              </div>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-gray-200">
              <span class="text-sm text-gray-500">
                View Details
              </span>
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white rounded-lg shadow-sm p-12 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
        <h3 class="mt-4 text-lg font-medium text-gray-900">No courses found</h3>
        <p class="mt-2 text-sm text-gray-500">
          Get started by adding your first golf course.
        </p>
        <div v-if="authStore.isAdmin" class="mt-6">
          <button
            @click="createCourse"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Add Course
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
