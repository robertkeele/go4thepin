import { ref, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useLeaderboard, type LeaderboardEntry } from './useLeaderboard'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useRealtimeLeaderboard(eventId: string, sortBy: 'gross' | 'net' = 'net') {
  const { fetchEventLeaderboard } = useLeaderboard()

  const leaderboard = ref<LeaderboardEntry[]>([])
  const isConnected = ref(false)
  const isLoading = ref(false)
  const errorMessage = ref<string>('')

  let channel: RealtimeChannel | null = null

  /**
   * Load initial leaderboard data
   */
  const loadLeaderboard = async () => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const entries = await fetchEventLeaderboard(eventId, sortBy)
      leaderboard.value = entries
    } catch (error: any) {
      errorMessage.value = `Failed to load leaderboard: ${error.message}`
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Subscribe to real-time updates for rounds in this event
   */
  const subscribe = async () => {
    // Load initial data
    await loadLeaderboard()

    // Create a channel for this event
    channel = supabase.channel(`event-leaderboard-${eventId}`)

    // Subscribe to INSERT events on rounds table
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rounds',
          filter: `event_id=eq.${eventId}`
        },
        async (payload) => {
          console.log('New round inserted:', payload)
          // Reload leaderboard when new round is posted
          await loadLeaderboard()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rounds',
          filter: `event_id=eq.${eventId}`
        },
        async (payload) => {
          console.log('Round updated:', payload)
          // Reload leaderboard when round is updated
          await loadLeaderboard()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'rounds',
          filter: `event_id=eq.${eventId}`
        },
        async (payload) => {
          console.log('Round deleted:', payload)
          // Reload leaderboard when round is deleted
          await loadLeaderboard()
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          isConnected.value = true
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isConnected.value = false
        }
      })
  }

  /**
   * Unsubscribe from real-time updates
   */
  const unsubscribe = async () => {
    if (channel) {
      await supabase.removeChannel(channel)
      channel = null
      isConnected.value = false
    }
  }

  /**
   * Manually refresh leaderboard
   */
  const refresh = async () => {
    await loadLeaderboard()
  }

  // Auto-unsubscribe when component unmounts
  onUnmounted(() => {
    unsubscribe()
  })

  return {
    leaderboard,
    isConnected,
    isLoading,
    errorMessage,
    subscribe,
    unsubscribe,
    refresh
  }
}
