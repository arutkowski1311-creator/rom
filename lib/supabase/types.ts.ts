// lib/supabase/types.ts
// TypeScript types matching the schema exactly

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; role: 'guest'|'guide'|'admin'; full_name: string|null; email: string|null; avatar_url: string|null; phone: string|null; location: string|null; created_at: string; updated_at: string }
        Insert: { id: string; role?: 'guest'|'guide'|'admin'; full_name?: string|null; email?: string|null; avatar_url?: string|null; phone?: string|null; location?: string|null }
        Update: { role?: 'guest'|'guide'|'admin'; full_name?: string|null; email?: string|null; avatar_url?: string|null; phone?: string|null; location?: string|null }
      }
      guides: {
        Row: { id: string; profile_id: string; slug: string; tagline: string|null; bio: string|null; location: string|null; home_base: string|null; country: string|null; primary_region: string|null; destinations: string|null; travel_type: string|null; categories: string[]|null; languages: string[]|null; years_experience: string|null; group_pref: string|null; specialties: string|null; style: string|null; season_notes: string|null; min_advance: string|null; max_advance: string|null; profile_photo_url: string|null; cover_photo_url: string|null; verified: boolean; insured: boolean; licensed: boolean; certifications: string[]|null; stripe_account_id: string|null; stripe_connected: boolean; status: 'draft'|'pending'|'active'|'suspended'; rating: number; review_count: number; response_rate: number; profile_views: number; created_at: string; updated_at: string }
        Insert: { profile_id: string; slug: string; tagline?: string|null; bio?: string|null; location?: string|null; categories?: string[]|null; languages?: string[]|null; status?: 'draft'|'pending'|'active'|'suspended' }
        Update: { tagline?: string|null; bio?: string|null; location?: string|null; categories?: string[]|null; languages?: string[]|null; status?: 'draft'|'pending'|'active'|'suspended'; profile_photo_url?: string|null; cover_photo_url?: string|null }
      }
      packages: {
        Row: { id: string; guide_id: string; title: string; category: string|null; duration: string|null; price: number; price_type: 'person'|'flat'; min_guests: number; max_guests: number; includes: string|null; meeting_point: string|null; description: string|null; active: boolean; sort_order: number; booking_count: number; rating: number; created_at: string; updated_at: string }
        Insert: { guide_id: string; title: string; price: number; price_type?: 'person'|'flat'; min_guests?: number; max_guests?: number; category?: string|null; duration?: string|null; includes?: string|null; meeting_point?: string|null; description?: string|null }
        Update: { title?: string; price?: number; price_type?: 'person'|'flat'; min_guests?: number; max_guests?: number; category?: string|null; duration?: string|null; includes?: string|null; description?: string|null; active?: boolean }
      }
      bookings: {
        Row: { id: string; confirmation_code: string; guest_id: string; guide_id: string; package_id: string; trip_date: string; guests: number; guest_message: string|null; subtotal: number; service_fee: number; total: number; deposit: number; balance: number; status: 'pending'|'confirmed'|'completed'|'cancelled'|'declined'; deposit_paid_at: string|null; balance_due_date: string|null; balance_paid_at: string|null; cancelled_at: string|null; refund_amount: number|null; created_at: string; updated_at: string }
        Insert: { guest_id: string; guide_id: string; package_id: string; trip_date: string; guests: number; guest_message?: string|null; package_price: number; price_type: string; subtotal: number; service_fee: number; total: number; deposit: number; balance: number; balance_due_date?: string|null }
        Update: { status?: 'pending'|'confirmed'|'completed'|'cancelled'|'declined'; deposit_paid_at?: string|null; balance_paid_at?: string|null; cancelled_at?: string|null; refund_amount?: number|null }
      }
      message_threads: {
        Row: { id: string; guest_id: string; guide_id: string; booking_id: string|null; last_message_at: string|null; created_at: string }
        Insert: { guest_id: string; guide_id: string; booking_id?: string|null }
        Update: { booking_id?: string|null }
      }
      messages: {
        Row: { id: string; thread_id: string; sender_id: string; body: string; read_at: string|null; created_at: string }
        Insert: { thread_id: string; sender_id: string; body: string }
        Update: { read_at?: string|null }
      }
      reviews: {
        Row: { id: string; booking_id: string; guide_id: string; guest_id: string; package_id: string|null; rating: number; body: string; trip_label: string|null; created_at: string }
        Insert: { booking_id: string; guide_id: string; guest_id: string; package_id?: string|null; rating: number; body: string; trip_label?: string|null }
        Update: never
      }
      guest_loyalty: {
        Row: { id: string; guest_id: string; tier: 'Wanderer'|'Explorer'|'Pioneer'|'Pathfinder'|'Legend'; trips_completed: number; total_spent: number; updated_at: string }
        Insert: { guest_id: string }
        Update: { tier?: 'Wanderer'|'Explorer'|'Pioneer'|'Pathfinder'|'Legend'; trips_completed?: number; total_spent?: number }
      }
    }
  }
}

// Convenience types
export type Profile    = Database['public']['Tables']['profiles']['Row']
export type Guide      = Database['public']['Tables']['guides']['Row']
export type Package    = Database['public']['Tables']['packages']['Row']
export type Booking    = Database['public']['Tables']['bookings']['Row']
export type Message    = Database['public']['Tables']['messages']['Row']
export type Thread     = Database['public']['Tables']['message_threads']['Row']
export type Review     = Database['public']['Tables']['reviews']['Row']
export type Loyalty    = Database['public']['Tables']['guest_loyalty']['Row']

// Joined types used in UI
export type GuideWithPackages = Guide & { packages: Package[] }
export type BookingWithDetails = Booking & { guide: Pick<Guide,'slug'|'location'|'profile_photo_url'>; package: Pick<Package,'title'|'duration'|'includes'|'meeting_point'>; guest: Pick<Profile,'full_name'|'email'> }
