<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useHandicap } from '@/composables/useHandicap'
import { formatHandicapIndex } from '@/utils/handicap'

interface Props {
  userId: string
  currentHandicapIndex?: number | null
}

const props = defineProps<Props>()

const { fetchHandicapHistory, isLoading } = useHandicap()
const handicapHistory = ref<any[]>([])

// Load handicap history
onMounted(async () => {
  handicapHistory.value = await fetchHandicapHistory(props.userId, 12)
})

// Compute trend (up or down)
const handicapTrend = computed(() => {
  if (handicapHistory.value.length < 2) return null

  const latest = handicapHistory.value[0]?.handicap_index
  const previous = handicapHistory.value[1]?.handicap_index

  if (!latest || !previous) return null

  const diff = latest - previous
  return {
    direction: diff < 0 ? 'down' : diff > 0 ? 'up' : 'stable',
    value: Math.abs(diff).toFixed(1)
  }
})

// Format display
const displayHandicap = computed(() => {
  return formatHandicapIndex(props.currentHandicapIndex)
})
</script>

<template>
  <div class="bg-white rounded-lg shadow p-6">
    <div class="flex justify-between items-start mb-4">
      <div>
        <h3 class="text-lg font-medium text-gray-900">Handicap Index</h3>
        <p class="text-sm text-gray-500">USGA WHS</p>
      </div>
      <div v-if="handicapTrend" class="flex items-center text-sm">
        <span
          v-if="handicapTrend.direction === 'down'"
          class="text-green-600 flex items-center"
        >
          ↓ {{ handicapTrend.value }}
        </span>
        <span
          v-else-if="handicapTrend.direction === 'up'"
          class="text-red-600 flex items-center"
        >
          ↑ {{ handicapTrend.value }}
        </span>
        <span v-else class="text-gray-500">
          → Stable
        </span>
      </div>
    </div>

    <!-- Current Handicap Display -->
    <div class="mb-6">
      <div class="text-5xl font-bold text-gray-900 mb-2">
        {{ displayHandicap }}
      </div>
      <p v-if="!currentHandicapIndex" class="text-sm text-gray-500">
        Post at least 5 rounds to establish your handicap
      </p>
      <p v-else class="text-sm text-gray-500">
        Based on {{ handicapHistory[0]?.rounds_count || 8 }} best rounds
      </p>
    </div>

    <!-- Mini Chart -->
    <div v-if="handicapHistory.length > 1" class="mb-4">
      <div class="text-xs font-medium text-gray-500 mb-2">Recent Trend</div>
      <div class="flex items-end space-x-1 h-20">
        <div
          v-for="(record, index) in handicapHistory.slice(0, 12).reverse()"
          :key="index"
          class="flex-1 bg-primary-200 rounded-t transition-all hover:bg-primary-300"
          :style="{
            height: `${Math.min(((record.handicap_index || 0) / 30) * 100, 100)}%`,
            minHeight: '4px'
          }"
          :title="`${formatHandicapIndex(record.handicap_index)} on ${new Date(record.recorded_date).toLocaleDateString()}`"
        ></div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div v-if="handicapHistory.length > 0" class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
      <div>
        <div class="text-xs text-gray-500">Lowest</div>
        <div class="text-lg font-semibold text-gray-900">
          {{ formatHandicapIndex(Math.min(...handicapHistory.map(h => h.handicap_index))) }}
        </div>
      </div>
      <div>
        <div class="text-xs text-gray-500">Highest</div>
        <div class="text-lg font-semibold text-gray-900">
          {{ formatHandicapIndex(Math.max(...handicapHistory.map(h => h.handicap_index))) }}
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-4">
      <p class="text-sm text-gray-500">Loading handicap data...</p>
    </div>
  </div>
</template>
