import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types/models'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isMember = computed(() => user.value?.role === 'member')

  // Actions
  const setUser = (newUser: User | null) => {
    user.value = newUser
  }

  const setLoading = (isLoading: boolean) => {
    loading.value = isLoading
  }

  /**
   * Initialize auth state from session
   */
  const initializeAuth = async () => {
    if (initialized.value) return

    try {
      setLoading(true)

      // Get current session
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        await fetchUserProfile(session.user.id)
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          await fetchUserProfile(session.user.id)
        }
      })

      initialized.value = true
    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Fetch user profile from database
   */
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data) {
        setUser({
          id: data.id,
          email: data.email,
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          phone: data.phone || undefined,
          ghinNumber: data.ghin_number || undefined,
          role: data.role,
          currentHandicapIndex: data.current_handicap_index || undefined,
          avatarUrl: data.avatar_url || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      throw error
    }
  }

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        await fetchUserProfile(data.user.id)
      }

      return { success: true, error: null }
    } catch (error: any) {
      console.error('Sign in error:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign up with email and password
   */
  const signUp = async (
    email: string,
    password: string,
    additionalData?: { firstName?: string; lastName?: string }
  ) => {
    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      // Profile is automatically created by trigger, but update with additional data
      if (data.user && additionalData) {
        await supabase
          .from('profiles')
          .update({
            first_name: additionalData.firstName,
            last_name: additionalData.lastName,
          })
          .eq('id', data.user.id)

        await fetchUserProfile(data.user.id)
      }

      return { success: true, error: null }
    } catch (error: any) {
      console.error('Sign up error:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign out
   */
  const signOut = async () => {
    try {
      setLoading(true)

      const { error } = await supabase.auth.signOut()

      if (error) throw error

      setUser(null)
      return { success: true, error: null }
    } catch (error: any) {
      console.error('Sign out error:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Update current user profile
   */
  const updateUserProfile = async (updates: {
    firstName?: string
    lastName?: string
    phone?: string
    ghinNumber?: string
  }) => {
    if (!user.value) {
      return { success: false, error: 'No user logged in' }
    }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          phone: updates.phone,
          ghin_number: updates.ghinNumber,
        })
        .eq('id', user.value.id)

      if (error) throw error

      await fetchUserProfile(user.value.id)

      return { success: true, error: null }
    } catch (error: any) {
      console.error('Update profile error:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  return {
    // State
    user,
    loading,
    initialized,

    // Getters
    isAuthenticated,
    isAdmin,
    isMember,

    // Actions
    initializeAuth,
    signIn,
    signUp,
    signOut,
    updateUserProfile,
    fetchUserProfile,
  }
})
