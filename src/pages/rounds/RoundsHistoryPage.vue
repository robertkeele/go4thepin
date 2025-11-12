<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import type { Round } from '@/types/models'

const authStore = useAuthStore()
const router = useRouter()

const rounds = ref<Array<Round & { courseName?: string, teeBoxName?: string }>>([])
const isLoading = ref(false)
const errorMessage = ref<string>('')
const selectedRoundId = ref<string | null>(null)
const holeScores = ref<any[]>([])
const isLoadingScores = ref(false)

// Load user's rounds
const loadRounds = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    if (!authStore.user?.id) {
      errorMessage.value = 'User not authenticated'
      isLoading.value = false
      return
    }

    const { data, error } = await supabase
      .from('rounds')
      .select(`
        *,
        course:courses(name),
        tee_box:tee_boxes(name, color)
      `)
      .eq('user_id', authStore.user.id)
      .order('played_date', { ascending: false })

    if (error) throw error
    if (!data) return

    rounds.value = data.map((round: any) => ({
      id: round.id,
      userId: round.user_id,
      eventId: round.event_id,
      courseId: round.course_id,
      teeBoxId: round.tee_box_id,
      playedDate: round.played_date,
      totalScore: round.total_score,
      courseHandicap: round.course_handicap,
      adjustedScore: round.adjusted_score,
      scoreDifferential: round.score_differential,
      isPostedForHandicap: round.is_posted_for_handicap,
      createdAt: round.created_at,
      updatedAt: round.updated_at,
      courseName: round.course?.name,
      teeBoxName: `${round.tee_box?.name} (${round.tee_box?.color})`
    }))
  } catch (error: any) {
    errorMessage.value = `Failed to load rounds: ${error.message}`
  } finally {
    isLoading.value = false
  }
}

// Load hole-by-hole scores for a round
const loadRoundScores = async (roundId: string) => {
  if (selectedRoundId.value === roundId) {
    // Toggle off if already selected
    selectedRoundId.value = null
    holeScores.value = []
    return
  }

  selectedRoundId.value = roundId
  isLoadingScores.value = true

  try {
    const { data, error } = await supabase
      .from('scores')
      .select(`
        *,
        hole:holes(hole_number, par)
      `)
      .eq('round_id', roundId)

    if (error) throw error
    if (!data) return

    // Map and sort by hole number
    holeScores.value = data
      .map((score: any) => ({
        holeNumber: score.hole.hole_number,
        par: score.hole.par,
        strokes: score.strokes,
        putts: score.putts,
        fairwayHit: score.fairway_hit,
        gir: score.gir
      }))
      .sort((a, b) => a.holeNumber - b.holeNumber)
  } catch (error: any) {
    errorMessage.value = `Failed to load scores: ${error.message}`
  } finally {
    isLoadingScores.value = false
  }
}

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Calculate score to par
const scoreToPar = (totalScore: number, coursePar: number = 72) => {
  const diff = totalScore - coursePar
  if (diff === 0) return 'E'
  if (diff > 0) return `+${diff}`
  return diff.toString()
}

// Computed totals for scorecard
const frontNine = computed(() => holeScores.value.slice(0, 9))
const backNine = computed(() => holeScores.value.slice(9, 18))

const frontNineTotal = computed(() =>
  frontNine.value.reduce((sum, score) => sum + score.strokes, 0)
)

const backNineTotal = computed(() =>
  backNine.value.reduce((sum, score) => sum + score.strokes, 0)
)

const frontNinePar = computed(() =>
  frontNine.value.reduce((sum, score) => sum + score.par, 0)
)

const backNinePar = computed(() =>
  backNine.value.reduce((sum, score) => sum + score.par, 0)
)

onMounted(() => {
  loadRounds()
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
            <h1 class="text-2xl font-bold text-gray-900">My Rounds</h1>
          </div>
          <div class="flex items-center">
            <button
              @click="router.push('/rounds/enter')"
              class="px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              + Enter New Round
            </button>
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

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-12">
          <p class="text-gray-600">Loading rounds...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="rounds.length === 0" class="text-center py-12">
          <div class="bg-white rounded-lg shadow p-8">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No rounds yet</h3>
            <p class="mt-1 text-sm text-gray-500">Get started by entering your first round.</p>
            <div class="mt-6">
              <button
                @click="router.push('/rounds/enter')"
                class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Enter New Round
              </button>
            </div>
          </div>
        </div>

        <!-- Rounds List -->
        <div v-else class="space-y-4">
          <div
            v-for="round in rounds"
            :key="round.id"
            class="bg-white shadow rounded-lg overflow-hidden"
          >
            <!-- Round Summary -->
            <div
              @click="loadRoundScores(round.id)"
              class="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <h3 class="text-lg font-medium text-gray-900">
                    {{ round.courseName }}
                  </h3>
                  <p class="mt-1 text-sm text-gray-500">
                    {{ round.teeBoxName }} • {{ formatDate(round.playedDate) }}
                  </p>
                </div>
                <div class="text-right">
                  <div class="text-3xl font-bold text-gray-900">
                    {{ round.totalScore }}
                  </div>
                  <div class="text-sm text-gray-600">
                    {{ scoreToPar(round.totalScore) }}
                  </div>
                </div>
              </div>

              <!-- Expand indicator -->
              <div class="mt-2 text-sm text-primary-600">
                {{ selectedRoundId === round.id ? '▼ Hide details' : '▶ View scorecard' }}
              </div>
            </div>

            <!-- Detailed Scorecard (Expandable) -->
            <div
              v-if="selectedRoundId === round.id"
              class="border-t border-gray-200 bg-gray-50 p-6"
            >
              <div v-if="isLoadingScores" class="text-center py-4">
                <p class="text-gray-600">Loading scorecard...</p>
              </div>

              <div v-else-if="holeScores.length > 0">
                <!-- Front 9 -->
                <div class="mb-6">
                  <h4 class="text-sm font-medium text-gray-900 mb-2">Front 9</h4>
                  <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                      <thead class="bg-white">
                        <tr>
                          <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hole</th>
                          <th v-for="hole in frontNine" :key="hole.holeNumber" class="px-3 py-2 text-center text-xs font-medium text-gray-500">
                            {{ hole.holeNumber }}
                          </th>
                          <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Out</th>
                        </tr>
                      </thead>
                      <tbody class="bg-white">
                        <tr>
                          <td class="px-3 py-2 text-xs font-medium text-gray-900">Par</td>
                          <td v-for="hole in frontNine" :key="'par-' + hole.holeNumber" class="px-3 py-2 text-center text-sm text-gray-500">
                            {{ hole.par }}
                          </td>
                          <td class="px-3 py-2 text-center text-sm font-bold text-gray-900">{{ frontNinePar }}</td>
                        </tr>
                        <tr class="bg-gray-50">
                          <td class="px-3 py-2 text-xs font-medium text-gray-900">Score</td>
                          <td v-for="hole in frontNine" :key="'score-' + hole.holeNumber" class="px-3 py-2 text-center text-sm font-bold"
                              :class="{
                                'text-red-600': hole.strokes > hole.par + 1,
                                'text-orange-600': hole.strokes === hole.par + 1,
                                'text-gray-900': hole.strokes === hole.par,
                                'text-blue-600': hole.strokes === hole.par - 1,
                                'text-green-600': hole.strokes < hole.par - 1
                              }">
                            {{ hole.strokes }}
                          </td>
                          <td class="px-3 py-2 text-center text-sm font-bold text-gray-900">{{ frontNineTotal }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Back 9 -->
                <div>
                  <h4 class="text-sm font-medium text-gray-900 mb-2">Back 9</h4>
                  <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                      <thead class="bg-white">
                        <tr>
                          <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hole</th>
                          <th v-for="hole in backNine" :key="hole.holeNumber" class="px-3 py-2 text-center text-xs font-medium text-gray-500">
                            {{ hole.holeNumber }}
                          </th>
                          <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">In</th>
                          <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody class="bg-white">
                        <tr>
                          <td class="px-3 py-2 text-xs font-medium text-gray-900">Par</td>
                          <td v-for="hole in backNine" :key="'par-' + hole.holeNumber" class="px-3 py-2 text-center text-sm text-gray-500">
                            {{ hole.par }}
                          </td>
                          <td class="px-3 py-2 text-center text-sm font-bold text-gray-900">{{ backNinePar }}</td>
                          <td class="px-3 py-2 text-center text-sm font-bold text-gray-900">{{ frontNinePar + backNinePar }}</td>
                        </tr>
                        <tr class="bg-gray-50">
                          <td class="px-3 py-2 text-xs font-medium text-gray-900">Score</td>
                          <td v-for="hole in backNine" :key="'score-' + hole.holeNumber" class="px-3 py-2 text-center text-sm font-bold"
                              :class="{
                                'text-red-600': hole.strokes > hole.par + 1,
                                'text-orange-600': hole.strokes === hole.par + 1,
                                'text-gray-900': hole.strokes === hole.par,
                                'text-blue-600': hole.strokes === hole.par - 1,
                                'text-green-600': hole.strokes < hole.par - 1
                              }">
                            {{ hole.strokes }}
                          </td>
                          <td class="px-3 py-2 text-center text-sm font-bold text-gray-900">{{ backNineTotal }}</td>
                          <td class="px-3 py-2 text-center text-sm font-bold text-gray-900">{{ frontNineTotal + backNineTotal }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Stats Summary -->
                <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div class="bg-white rounded p-3">
                    <div class="text-xs text-gray-500">Total Putts</div>
                    <div class="text-lg font-bold text-gray-900">
                      {{ holeScores.reduce((sum, s) => sum + (s.putts || 0), 0) || '-' }}
                    </div>
                  </div>
                  <div class="bg-white rounded p-3">
                    <div class="text-xs text-gray-500">Fairways Hit</div>
                    <div class="text-lg font-bold text-gray-900">
                      {{ holeScores.filter(s => s.fairwayHit).length }}
                    </div>
                  </div>
                  <div class="bg-white rounded p-3">
                    <div class="text-xs text-gray-500">GIR</div>
                    <div class="text-lg font-bold text-gray-900">
                      {{ holeScores.filter(s => s.gir).length }}
                    </div>
                  </div>
                  <div class="bg-white rounded p-3">
                    <div class="text-xs text-gray-500">Score</div>
                    <div class="text-lg font-bold text-gray-900">
                      {{ frontNineTotal + backNineTotal }}
                    </div>
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
