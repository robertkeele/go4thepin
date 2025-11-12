import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export interface UserStats {
  totalRounds: number
  averageScore: number
  lowestScore: number
  highestScore: number
  bestRound?: {
    score: number
    courseName: string
    date: string
  }
  scoringAverages: {
    eagles: number
    birdies: number
    pars: number
    bogeys: number
    doubleBogeys: number
    worse: number
  }
  recentForm: Array<{
    date: string
    score: number
    courseName: string
  }>
}

export function useStats() {
  const isLoading = ref(false)
  const errorMessage = ref<string>('')

  /**
   * Fetch comprehensive statistics for a user
   */
  const fetchUserStats = async (userId: string): Promise<UserStats | null> => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      // Fetch all rounds for the user
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select(`
          id,
          total_score,
          played_date,
          course:courses(name)
        `)
        .eq('user_id', userId)
        .order('played_date', { ascending: false })

      if (roundsError) throw roundsError
      if (!rounds || rounds.length === 0) {
        return {
          totalRounds: 0,
          averageScore: 0,
          lowestScore: 0,
          highestScore: 0,
          scoringAverages: {
            eagles: 0,
            birdies: 0,
            pars: 0,
            bogeys: 0,
            doubleBogeys: 0,
            worse: 0
          },
          recentForm: []
        }
      }

      // Calculate basic stats
      const totalRounds = rounds.length
      const scores = (rounds as any[]).map(r => r.total_score)
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalRounds
      const lowestScore = Math.min(...scores)
      const highestScore = Math.max(...scores)

      // Find best round
      const bestRoundData = (rounds as any[]).find(r => r.total_score === lowestScore)
      const bestRound = bestRoundData
        ? {
            score: bestRoundData.total_score,
            courseName: bestRoundData.course?.name || 'Unknown',
            date: bestRoundData.played_date
          }
        : undefined

      // Recent form (last 5 rounds)
      const recentForm = (rounds as any[]).slice(0, 5).map(round => ({
        date: round.played_date,
        score: round.total_score,
        courseName: round.course?.name || 'Unknown'
      }))

      // Fetch hole-by-hole scores for scoring averages
      const roundIds = (rounds as any[]).map(r => r.id)
      const { data: holeScores, error: scoresError } = await supabase
        .from('scores')
        .select(`
          strokes,
          hole:holes(par)
        `)
        .in('round_id', roundIds)

      if (scoresError) throw scoresError

      // Calculate scoring distribution
      const scoringAverages = {
        eagles: 0,
        birdies: 0,
        pars: 0,
        bogeys: 0,
        doubleBogeys: 0,
        worse: 0
      }

      if (holeScores) {
        holeScores.forEach((score: any) => {
          const diff = score.strokes - score.hole.par

          if (diff <= -2) scoringAverages.eagles++
          else if (diff === -1) scoringAverages.birdies++
          else if (diff === 0) scoringAverages.pars++
          else if (diff === 1) scoringAverages.bogeys++
          else if (diff === 2) scoringAverages.doubleBogeys++
          else scoringAverages.worse++
        })
      }

      return {
        totalRounds,
        averageScore: Math.round(averageScore * 10) / 10,
        lowestScore,
        highestScore,
        bestRound,
        scoringAverages,
        recentForm
      }

    } catch (error: any) {
      errorMessage.value = `Failed to fetch statistics: ${error.message}`
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch statistics summary (lighter weight)
   */
  const fetchStatsSummary = async (userId: string) => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const { data: rounds, error } = await supabase
        .from('rounds')
        .select('total_score, played_date')
        .eq('user_id', userId)
        .order('played_date', { ascending: false })
        .limit(20)

      if (error) throw error
      if (!rounds || rounds.length === 0) {
        return {
          totalRounds: 0,
          averageScore: 0,
          lowestScore: 0,
          trend: 'stable' as 'up' | 'down' | 'stable'
        }
      }

      const totalRounds = rounds.length
      const scores = (rounds as any[]).map(r => r.total_score)
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalRounds
      const lowestScore = Math.min(...scores)

      // Calculate trend (compare last 5 vs previous 5)
      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (rounds.length >= 10) {
        const recentAvg = (rounds as any[]).slice(0, 5).reduce((sum, r) => sum + r.total_score, 0) / 5
        const previousAvg = (rounds as any[]).slice(5, 10).reduce((sum, r) => sum + r.total_score, 0) / 5
        if (recentAvg < previousAvg - 1) trend = 'up' // Improving (lower scores)
        else if (recentAvg > previousAvg + 1) trend = 'down' // Getting worse
      }

      return {
        totalRounds,
        averageScore: Math.round(averageScore * 10) / 10,
        lowestScore,
        trend
      }

    } catch (error: any) {
      errorMessage.value = `Failed to fetch stats summary: ${error.message}`
      return {
        totalRounds: 0,
        averageScore: 0,
        lowestScore: 0,
        trend: 'stable' as 'up' | 'down' | 'stable'
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    errorMessage,
    fetchUserStats,
    fetchStatsSummary
  }
}
