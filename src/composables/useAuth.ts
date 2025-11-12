import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types/models'
import type { AuthError } from '@supabase/supabase-js'

export const useAuth = () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      if (data.user) {
        await fetchUserProfile(data.user.id)
      }

      return { data, error: null }
    } catch (err) {
      const authError = err as AuthError
      error.value = authError.message
      return { data: null, error: authError }
    } finally {
      loading.value = false
    }
  }

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string, userData?: { firstName?: string; lastName?: string }) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError

      // Update profile with additional data if provided
      if (data.user && userData) {
        await updateProfile(data.user.id, userData)
      }

      return { data, error: null }
    } catch (err) {
      const authError = err as AuthError
      error.value = authError.message
      return { data: null, error: authError }
    } finally {
      loading.value = false
    }
  }

  /**
   * Sign out current user
   */
  const signOut = async () => {
    try {
      loading.value = true
      error.value = null

      const { error: authError } = await supabase.auth.signOut()

      if (authError) throw authError

      user.value = null
      return { error: null }
    } catch (err) {
      const authError = err as AuthError
      error.value = authError.message
      return { error: authError }
    } finally {
      loading.value = false
    }
  }

  /**
   * Get current user session and profile
   */
  const getCurrentUser = async () => {
    try {
      loading.value = true
      error.value = null

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authError) throw authError

      if (authUser) {
        await fetchUserProfile(authUser.id)
      } else {
        user.value = null
      }

      return { user: user.value, error: null }
    } catch (err) {
      const authError = err as AuthError
      error.value = authError.message
      user.value = null
      return { user: null, error: authError }
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch user profile from database
   */
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError

      if (data) {
        user.value = {
          id: data.id as string,
          email: data.email as string,
          firstName: (data.first_name as string) || '',
          lastName: (data.last_name as string) || '',
          phone: (data.phone as string) || undefined,
          ghinNumber: (data.ghin_number as string) || undefined,
          role: data.role as 'admin' | 'member' | 'viewer',
          currentHandicapIndex: (data.current_handicap_index as number) || undefined,
          avatarUrl: (data.avatar_url as string) || undefined,
          createdAt: data.created_at as string,
          updatedAt: data.updated_at as string,
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
      throw err
    }
  }

  /**
   * Update user profile
   */
  const updateProfile = async (userId: string, updates: { firstName?: string; lastName?: string; phone?: string; ghinNumber?: string }) => {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          phone: updates.phone,
          ghin_number: updates.ghinNumber,
        })
        .eq('id', userId)

      if (updateError) throw updateError

      // Refresh user profile
      await fetchUserProfile(userId)
    } catch (err) {
      console.error('Error updating profile:', err)
      throw err
    }
  }

  /**
   * Reset password
   */
  const resetPassword = async (email: string) => {
    try {
      loading.value = true
      error.value = null

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) throw resetError

      return { error: null }
    } catch (err) {
      const authError = err as AuthError
      error.value = authError.message
      return { error: authError }
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    signIn,
    signUp,
    signOut,
    getCurrentUser,
    updateProfile,
    resetPassword,
  }
}
