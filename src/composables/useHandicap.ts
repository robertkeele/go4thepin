import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import {
  calculateHandicapIndex,
  calculateScoreDifferential,
  calculateCourseHandicap,
  calculateAdjustedGrossScore,
  type ScoreDifferentialData,
  type HandicapCalculationResult
} from '@/utils/handicap'

export function useHandicap() {
  const isLoading = ref(false)
  const errorMessage = ref<string>('')

  /**
   * Fetch all eligible rounds for a user and calculate their handicap index
   */
  const calculateUserHandicap = async (userId: string): Promise<HandicapCalculationResult | null> => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      // Fetch all rounds posted for handicap with course/tee box data
      const { data: rounds, error } = await supabase
        .from('rounds')
        .select(`
          id,
          total_score,
          adjusted_score,
          played_date,
          tee_box:tee_boxes(
            course_rating,
            slope_rating
          )
        `)
        .eq('user_id', userId)
        .eq('is_posted_for_handicap', true)
        .order('played_date', { ascending: false })

      if (error) throw error
      if (!rounds || rounds.length < 5) {
        return null // Need at least 5 rounds
      }

      // Transform data for handicap calculation
      const scoreDifferentials: ScoreDifferentialData[] = (rounds as any[])
        .filter((round: any) => {
          // Ensure we have valid data
          return (
            round.adjusted_score &&
            round.tee_box &&
            round.tee_box.course_rating &&
            round.tee_box.slope_rating
          )
        })
        .map((round: any) => ({
          adjustedGrossScore: round.adjusted_score,
          courseRating: round.tee_box.course_rating,
          slopeRating: round.tee_box.slope_rating,
          playedDate: round.played_date
        }))

      // Calculate handicap index
      const result = calculateHandicapIndex(scoreDifferentials)
      return result

    } catch (error: any) {
      errorMessage.value = `Failed to calculate handicap: ${error.message}`
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update a round with handicap calculations and post it for handicap
   */
  const postRoundForHandicap = async (
    roundId: string,
    userId: string,
    holeScores: number[],
    holePars: number[],
    courseRating: number,
    slopeRating: number,
    totalScore: number
  ): Promise<boolean> => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      // Calculate course handicap (use 0 if user has no handicap yet)
      const currentHandicapResult = await calculateUserHandicap(userId)
      const handicapIndex = currentHandicapResult?.handicapIndex || 0
      const courseHandicap = calculateCourseHandicap(handicapIndex, slopeRating, courseRating)

      // Calculate adjusted gross score using ESC
      const adjustedScore = calculateAdjustedGrossScore(holeScores, holePars, courseHandicap)

      // Calculate score differential
      const scoreDifferential = calculateScoreDifferential(
        adjustedScore,
        courseRating,
        slopeRating
      )

      // Update the round with handicap data
      const { error: updateError } = await (supabase
        .from('rounds') as any)
        .update({
          course_handicap: courseHandicap,
          adjusted_score: adjustedScore,
          score_differential: scoreDifferential,
          is_posted_for_handicap: true
        })
        .eq('id', roundId)

      if (updateError) throw updateError

      // Recalculate user's handicap index with this new round
      const newHandicapResult = await calculateUserHandicap(userId)

      if (newHandicapResult) {
        // Update user's profile with new handicap index
        const { error: profileError } = await (supabase
          .from('profiles') as any)
          .update({
            current_handicap_index: newHandicapResult.handicapIndex
          })
          .eq('id', userId)

        if (profileError) throw profileError

        // Store in handicap history
        const { error: historyError } = await (supabase
          .from('handicap_history') as any)
          .insert({
            user_id: userId,
            handicap_index: newHandicapResult.handicapIndex,
            recorded_date: new Date().toISOString().split('T')[0],
            rounds_count: newHandicapResult.numberOfScoresUsed
          })

        if (historyError) {
          // Don't fail if history insert fails, just log it
          console.error('Failed to store handicap history:', historyError)
        }
      }

      return true

    } catch (error: any) {
      errorMessage.value = `Failed to post round for handicap: ${error.message}`
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch handicap history for a user
   */
  const fetchHandicapHistory = async (userId: string, limit: number = 30) => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const { data, error } = await supabase
        .from('handicap_history')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_date', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data || []

    } catch (error: any) {
      errorMessage.value = `Failed to fetch handicap history: ${error.message}`
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get course handicap for a specific tee box
   */
  const getCourseHandicapForTeeBox = async (
    userId: string,
    teeBoxId: string
  ): Promise<number> => {
    try {
      // Get user's current handicap index
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('current_handicap_index')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError
      if (!(profile as any)?.current_handicap_index) return 0

      // Get tee box data
      const { data: teeBox, error: teeBoxError } = await supabase
        .from('tee_boxes')
        .select('course_rating, slope_rating')
        .eq('id', teeBoxId)
        .single()

      if (teeBoxError) throw teeBoxError
      if (!teeBox) return 0

      // Calculate course handicap
      return calculateCourseHandicap(
        (profile as any).current_handicap_index,
        (teeBox as any).slope_rating,
        (teeBox as any).course_rating
      )

    } catch (error: any) {
      console.error('Failed to calculate course handicap:', error)
      return 0
    }
  }

  /**
   * Recalculate handicap for all users (admin function)
   */
  const recalculateAllHandicaps = async (): Promise<{ success: number; failed: number }> => {
    isLoading.value = true
    errorMessage.value = ''

    let successCount = 0
    let failedCount = 0

    try {
      // Get all users
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id')

      if (error) throw error
      if (!profiles) return { success: 0, failed: 0 }

      // Recalculate for each user
      for (const profile of profiles) {
        try {
          const result = await calculateUserHandicap((profile as any).id)

          if (result) {
            await (supabase
              .from('profiles') as any)
              .update({
                current_handicap_index: result.handicapIndex
              })
              .eq('id', (profile as any).id)

            successCount++
          }
        } catch (err) {
          console.error(`Failed to recalculate handicap for user ${(profile as any).id}:`, err)
          failedCount++
        }
      }

      return { success: successCount, failed: failedCount }

    } catch (error: any) {
      errorMessage.value = `Failed to recalculate handicaps: ${error.message}`
      return { success: successCount, failed: failedCount }
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    errorMessage,
    calculateUserHandicap,
    postRoundForHandicap,
    fetchHandicapHistory,
    getCourseHandicapForTeeBox,
    recalculateAllHandicaps
  }
}
