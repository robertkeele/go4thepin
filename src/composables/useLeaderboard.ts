import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { calculateNetScore } from '@/utils/handicap'

export interface LeaderboardEntry {
  userId: string
  userName: string
  userFirstName: string
  userLastName: string
  grossScore: number
  netScore: number
  courseHandicap: number
  handicapIndex: number | null
  position: number
  roundId: string
  thru?: number
  scoreToPar?: number
}

export interface TeamLeaderboardEntry {
  teamId: string
  teamName: string
  totalGrossScore: number
  totalNetScore: number
  position: number
  members: Array<{
    userName: string
    grossScore: number
    netScore: number
  }>
}

export function useLeaderboard() {
  const isLoading = ref(false)
  const errorMessage = ref<string>('')

  /**
   * Fetch event leaderboard
   */
  const fetchEventLeaderboard = async (
    eventId: string,
    sortBy: 'gross' | 'net' = 'net'
  ): Promise<LeaderboardEntry[]> => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      // Fetch all rounds for this event with user profile data
      const { data: rounds, error } = await supabase
        .from('rounds')
        .select(`
          id,
          user_id,
          total_score,
          course_handicap,
          user:profiles!rounds_user_id_fkey(
            id,
            first_name,
            last_name,
            current_handicap_index
          )
        `)
        .eq('event_id', eventId)
        .order('total_score', { ascending: true })

      if (error) throw error
      if (!rounds || rounds.length === 0) return []

      // Transform to leaderboard entries
      const entries: LeaderboardEntry[] = rounds.map((round: any) => {
        const grossScore = round.total_score
        const courseHandicap = round.course_handicap || 0
        const netScore = calculateNetScore(grossScore, courseHandicap)

        return {
          userId: round.user_id,
          userName: `${round.user.first_name} ${round.user.last_name}`,
          userFirstName: round.user.first_name,
          userLastName: round.user.last_name,
          grossScore,
          netScore,
          courseHandicap,
          handicapIndex: round.user.current_handicap_index,
          position: 0, // Will be calculated
          roundId: round.id,
          scoreToPar: grossScore - 72 // Assuming par 72, should come from course
        }
      })

      // Sort based on preference
      const sortedEntries = [...entries].sort((a, b) => {
        const scoreA = sortBy === 'gross' ? a.grossScore : a.netScore
        const scoreB = sortBy === 'gross' ? b.grossScore : b.netScore
        return scoreA - scoreB
      })

      // Assign positions (handle ties)
      let currentPosition = 1
      sortedEntries.forEach((entry, index) => {
        if (index > 0) {
          const prevScore = sortBy === 'gross'
            ? sortedEntries[index - 1].grossScore
            : sortedEntries[index - 1].netScore
          const currentScore = sortBy === 'gross' ? entry.grossScore : entry.netScore

          if (currentScore !== prevScore) {
            currentPosition = index + 1
          }
        }
        entry.position = currentPosition
      })

      return sortedEntries

    } catch (error: any) {
      errorMessage.value = `Failed to fetch leaderboard: ${error.message}`
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch season standings (all rounds, not just events)
   */
  const fetchSeasonStandings = async (
    seasonYear?: number,
    sortBy: 'gross' | 'net' = 'net',
    limit: number = 50
  ): Promise<LeaderboardEntry[]> => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      // Build query for rounds
      let query = supabase
        .from('rounds')
        .select(`
          id,
          user_id,
          total_score,
          course_handicap,
          played_date,
          user:profiles!rounds_user_id_fkey(
            id,
            first_name,
            last_name,
            current_handicap_index
          )
        `)

      // Filter by season year if provided
      if (seasonYear) {
        const startDate = `${seasonYear}-01-01`
        const endDate = `${seasonYear}-12-31`
        query = query.gte('played_date', startDate).lte('played_date', endDate)
      }

      const { data: rounds, error } = await query.limit(limit * 5) // Get more data to aggregate

      if (error) throw error
      if (!rounds || rounds.length === 0) return []

      // Aggregate by user (calculate average scores)
      const userScores = new Map<string, {
        userId: string
        userName: string
        userFirstName: string
        userLastName: string
        handicapIndex: number | null
        totalGross: number
        totalNet: number
        roundCount: number
      }>()

      rounds.forEach((round: any) => {
        const grossScore = round.total_score
        const courseHandicap = round.course_handicap || 0
        const netScore = calculateNetScore(grossScore, courseHandicap)

        const existing = userScores.get(round.user_id)

        if (existing) {
          existing.totalGross += grossScore
          existing.totalNet += netScore
          existing.roundCount++
        } else {
          userScores.set(round.user_id, {
            userId: round.user_id,
            userName: `${round.user.first_name} ${round.user.last_name}`,
            userFirstName: round.user.first_name,
            userLastName: round.user.last_name,
            handicapIndex: round.user.current_handicap_index,
            totalGross: grossScore,
            totalNet: netScore,
            roundCount: 1
          })
        }
      })

      // Convert to leaderboard entries with averages
      const entries: LeaderboardEntry[] = Array.from(userScores.values()).map(user => ({
        userId: user.userId,
        userName: user.userName,
        userFirstName: user.userFirstName,
        userLastName: user.userLastName,
        grossScore: Math.round(user.totalGross / user.roundCount),
        netScore: Math.round(user.totalNet / user.roundCount),
        courseHandicap: 0,
        handicapIndex: user.handicapIndex,
        position: 0,
        roundId: '',
        thru: user.roundCount
      }))

      // Sort and assign positions
      const sortedEntries = [...entries].sort((a, b) => {
        const scoreA = sortBy === 'gross' ? a.grossScore : a.netScore
        const scoreB = sortBy === 'gross' ? b.grossScore : b.netScore
        return scoreA - scoreB
      })

      let currentPosition = 1
      sortedEntries.forEach((entry, index) => {
        if (index > 0) {
          const prevScore = sortBy === 'gross'
            ? sortedEntries[index - 1].grossScore
            : sortedEntries[index - 1].netScore
          const currentScore = sortBy === 'gross' ? entry.grossScore : entry.netScore

          if (currentScore !== prevScore) {
            currentPosition = index + 1
          }
        }
        entry.position = currentPosition
      })

      return sortedEntries.slice(0, limit)

    } catch (error: any) {
      errorMessage.value = `Failed to fetch season standings: ${error.message}`
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch team leaderboard for an event
   */
  const fetchTeamLeaderboard = async (
    eventId: string,
    sortBy: 'gross' | 'net' = 'net'
  ): Promise<TeamLeaderboardEntry[]> => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      // Fetch team scores for this event
      const { data: teamScores, error } = await supabase
        .from('team_scores')
        .select(`
          team_id,
          total_score,
          team:teams(
            id,
            name
          )
        `)
        .eq('event_id', eventId)

      if (error) throw error
      if (!teamScores || teamScores.length === 0) return []

      // Transform to team leaderboard entries
      const entries: TeamLeaderboardEntry[] = teamScores.map((ts: any) => ({
        teamId: ts.team_id,
        teamName: ts.team.name,
        totalGrossScore: ts.total_score,
        totalNetScore: ts.total_score, // Simplified, could calculate net for teams
        position: 0,
        members: [] // Could fetch team member scores
      }))

      // Sort and assign positions
      const sortedEntries = [...entries].sort((a, b) => {
        const scoreA = sortBy === 'gross' ? a.totalGrossScore : a.totalNetScore
        const scoreB = sortBy === 'gross' ? b.totalGrossScore : b.totalNetScore
        return scoreA - scoreB
      })

      let currentPosition = 1
      sortedEntries.forEach((entry, index) => {
        if (index > 0) {
          const prevScore = sortBy === 'gross'
            ? sortedEntries[index - 1].totalGrossScore
            : sortedEntries[index - 1].totalNetScore
          const currentScore = sortBy === 'gross' ? entry.totalGrossScore : entry.totalNetScore

          if (currentScore !== prevScore) {
            currentPosition = index + 1
          }
        }
        entry.position = currentPosition
      })

      return sortedEntries

    } catch (error: any) {
      errorMessage.value = `Failed to fetch team leaderboard: ${error.message}`
      return []
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    errorMessage,
    fetchEventLeaderboard,
    fetchSeasonStandings,
    fetchTeamLeaderboard
  }
}
