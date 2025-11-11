// This file will be auto-generated from Supabase once the database schema is created
// For now, we'll define basic types manually

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          ghin_number: string | null
          role: 'admin' | 'member' | 'viewer'
          current_handicap_index: number | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      courses: {
        Row: {
          id: string
          name: string
          city: string | null
          state: string | null
          total_par: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['courses']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['courses']['Insert']>
      }
      // Add more table types as needed
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: 'admin' | 'member' | 'viewer'
      event_status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
      scoring_format: 'stroke' | 'match' | 'stableford'
    }
  }
}
