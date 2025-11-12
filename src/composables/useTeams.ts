import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export interface TeamWithMembers {
  id: string
  name: string
  captainId: string
  seasonYear: number
  createdAt: string
  updatedAt: string
  captain?: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    role: 'admin' | 'member' | 'viewer'
    createdAt: string
    updatedAt: string
  }
  members: Array<{
    id: string
    firstName: string
    lastName: string
    currentHandicapIndex: number | null
  }>
  memberCount: number
}

export function useTeams() {
  const isLoading = ref(false)
  const errorMessage = ref<string>('')

  /**
   * Fetch all teams
   */
  const fetchTeams = async (seasonYear?: number): Promise<TeamWithMembers[]> => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      let query = supabase
        .from('teams')
        .select(`
          *,
          captain:profiles!teams_captain_id_fkey(
            id,
            first_name,
            last_name
          ),
          team_members(
            user:profiles(
              id,
              first_name,
              last_name,
              current_handicap_index
            )
          )
        `)
        .order('name')

      if (seasonYear) {
        query = query.eq('season_year', seasonYear)
      }

      const { data, error } = await query

      if (error) throw error
      if (!data) return []

      return (data as any[]).map(team => ({
        id: team.id,
        name: team.name,
        captainId: team.captain_id,
        seasonYear: team.season_year,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
        captain: team.captain ? {
          id: team.captain.id,
          firstName: team.captain.first_name,
          lastName: team.captain.last_name,
          email: '',
          phone: '',
          role: 'member',
          createdAt: '',
          updatedAt: ''
        } : undefined,
        members: team.team_members.map((tm: any) => ({
          id: tm.user.id,
          firstName: tm.user.first_name,
          lastName: tm.user.last_name,
          currentHandicapIndex: tm.user.current_handicap_index
        })),
        memberCount: team.team_members.length
      }))

    } catch (error: any) {
      errorMessage.value = `Failed to fetch teams: ${error.message}`
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch single team with details
   */
  const fetchTeam = async (teamId: string): Promise<TeamWithMembers | null> => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          captain:profiles!teams_captain_id_fkey(
            id,
            first_name,
            last_name
          ),
          team_members(
            user:profiles(
              id,
              first_name,
              last_name,
              current_handicap_index
            )
          )
        `)
        .eq('id', teamId)
        .single()

      if (error) throw error
      if (!data) return null

      const team = data as any
      return {
        id: team.id,
        name: team.name,
        captainId: team.captain_id,
        seasonYear: team.season_year,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
        captain: team.captain ? {
          id: team.captain.id,
          firstName: team.captain.first_name,
          lastName: team.captain.last_name,
          email: '',
          phone: '',
          role: 'member',
          createdAt: '',
          updatedAt: ''
        } : undefined,
        members: team.team_members.map((tm: any) => ({
          id: tm.user.id,
          firstName: tm.user.first_name,
          lastName: tm.user.last_name,
          currentHandicapIndex: tm.user.current_handicap_index
        })),
        memberCount: team.team_members.length
      }

    } catch (error: any) {
      errorMessage.value = `Failed to fetch team: ${error.message}`
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new team
   */
  const createTeam = async (
    name: string,
    captainId: string,
    seasonYear: number
  ): Promise<string | null> => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const { data, error } = await (supabase
        .from('teams') as any)
        .insert({
          name,
          captain_id: captainId,
          season_year: seasonYear
        })
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('Failed to create team')

      // Add captain as a team member
      const { error: memberError } = await (supabase
        .from('team_members') as any)
        .insert({
          team_id: data.id,
          user_id: captainId
        })

      if (memberError) throw memberError

      return data.id

    } catch (error: any) {
      errorMessage.value = `Failed to create team: ${error.message}`
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update team
   */
  const updateTeam = async (
    teamId: string,
    name: string,
    captainId: string
  ): Promise<boolean> => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const { error } = await (supabase
        .from('teams') as any)
        .update({
          name,
          captain_id: captainId
        })
        .eq('id', teamId)

      if (error) throw error
      return true

    } catch (error: any) {
      errorMessage.value = `Failed to update team: ${error.message}`
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete team
   */
  const deleteTeam = async (teamId: string): Promise<boolean> => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      // Delete team members first
      const { error: membersError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)

      if (membersError) throw membersError

      // Delete team
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (error) throw error
      return true

    } catch (error: any) {
      errorMessage.value = `Failed to delete team: ${error.message}`
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Add member to team
   */
  const addTeamMember = async (teamId: string, userId: string): Promise<boolean> => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const { error } = await (supabase
        .from('team_members') as any)
        .insert({
          team_id: teamId,
          user_id: userId
        })

      if (error) throw error
      return true

    } catch (error: any) {
      errorMessage.value = `Failed to add team member: ${error.message}`
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Remove member from team
   */
  const removeTeamMember = async (teamId: string, userId: string): Promise<boolean> => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId)

      if (error) throw error
      return true

    } catch (error: any) {
      errorMessage.value = `Failed to remove team member: ${error.message}`
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    errorMessage,
    fetchTeams,
    fetchTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember
  }
}
