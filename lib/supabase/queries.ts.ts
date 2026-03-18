// lib/supabase/queries.ts
// All database query functions used across the app

import { createClient } from './client'
import type { GuideWithPackages, BookingWithDetails } from './types'

const supabase = createClient()


// ─── GUIDES ───────────────────────────────────────────────────────────────────

/** Fetch a single guide by slug with their packages */
export async function getGuideBySlug(slug: string): Promise<GuideWithPackages | null> {
  const { data, error } = await supabase
    .from('guides')
    .select('*, packages(*)')
    .eq('slug', slug)
    .eq('status', 'active')
    .order('sort_order', { referencedTable: 'packages' })
    .single()
  if (error) { console.error('getGuideBySlug:', error); return null }
  return data as GuideWithPackages
}

/** Search guides with filters */
export async function searchGuides({
  category, maxPrice, query, sort = 'rating', limit = 20, offset = 0
}: {
  category?: string; maxPrice?: number; query?: string
  sort?: 'rating' | 'price_asc' | 'price_desc' | 'reviews'; limit?: number; offset?: number
}) {
  let q = supabase
    .from('guides')
    .select('*, packages!inner(price)')
    .eq('status', 'active')

  if (category) q = q.contains('categories', [category])
  if (maxPrice) q = q.lte('packages.price', maxPrice)
  if (query)    q = q.or(`tagline.ilike.%${query}%,bio.ilike.%${query}%,location.ilike.%${query}%`)

  if (sort === 'rating')     q = q.order('rating', { ascending: false })
  if (sort === 'reviews')    q = q.order('review_count', { ascending: false })
  if (sort === 'price_asc')  q = q.order('price', { referencedTable: 'packages', ascending: true })
  if (sort === 'price_desc') q = q.order('price', { referencedTable: 'packages', ascending: false })

  const { data, error } = await q.range(offset, offset + limit - 1)
  if (error) { console.error('searchGuides:', error); return [] }
  return data
}

/** Increment profile view count */
export async function incrementGuideViews(guideId: string) {
  await supabase.rpc('increment_guide_views', { guide_id: guideId })
}

/** Get reviews for a guide */
export async function getGuideReviews(guideId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles(full_name, avatar_url)')
    .eq('guide_id', guideId)
    .order('created_at', { ascending: false })
  if (error) { console.error('getGuideReviews:', error); return [] }
  return data
}


// ─── BOOKINGS ─────────────────────────────────────────────────────────────────

/** Create a new booking (after Stripe deposit payment) */
export async function createBooking(booking: {
  guestId: string; guideId: string; packageId: string
  tripDate: string; guests: number; guestMessage?: string
  packagePrice: number; priceType: string
  subtotal: number; serviceFee: number; total: number
  deposit: number; balance: number; balanceDueDate: string
  depositIntentId: string
}) {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      guest_id: booking.guestId, guide_id: booking.guideId, package_id: booking.packageId,
      trip_date: booking.tripDate, guests: booking.guests, guest_message: booking.guestMessage,
      package_price: booking.packagePrice, price_type: booking.priceType,
      subtotal: booking.subtotal, service_fee: booking.serviceFee,
      total: booking.total, deposit: booking.deposit, balance: booking.balance,
      balance_due_date: booking.balanceDueDate,
      deposit_paid_at: new Date().toISOString(),
      deposit_intent_id: booking.depositIntentId,
      status: 'pending',
    })
    .select()
    .single()
  if (error) { console.error('createBooking:', error); return null }
  return data
}

/** Get all bookings for the logged-in guest */
export async function getGuestBookings(guestId: string): Promise<BookingWithDetails[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`*, guides(slug,location,profile_photo_url), packages(title,duration,includes,meeting_point), profiles!bookings_guest_id_fkey(full_name,email)`)
    .eq('guest_id', guestId)
    .order('trip_date', { ascending: false })
  if (error) { console.error('getGuestBookings:', error); return [] }
  return data as BookingWithDetails[]
}

/** Get all bookings for the logged-in guide */
export async function getGuideBookings(guideId: string): Promise<BookingWithDetails[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`*, guides(slug,location), packages(title,duration,includes,meeting_point), profiles!bookings_guest_id_fkey(full_name,email)`)
    .eq('guide_id', guideId)
    .order('created_at', { ascending: false })
  if (error) { console.error('getGuideBookings:', error); return [] }
  return data as BookingWithDetails[]
}

/** Guide accepts or declines a booking */
export async function updateBookingStatus(bookingId: string, status: 'confirmed'|'declined') {
  const { error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
  if (error) console.error('updateBookingStatus:', error)
  return !error
}


// ─── MESSAGES ─────────────────────────────────────────────────────────────────

/** Get or create a message thread */
export async function getOrCreateThread(guestId: string, guideId: string, bookingId?: string) {
  const { data: existing } = await supabase
    .from('message_threads')
    .select('*')
    .eq('guest_id', guestId)
    .eq('guide_id', guideId)
    .single()
  if (existing) return existing

  const { data, error } = await supabase
    .from('message_threads')
    .insert({ guest_id: guestId, guide_id: guideId, booking_id: bookingId ?? null })
    .select()
    .single()
  if (error) { console.error('getOrCreateThread:', error); return null }
  return data
}

/** Get all messages in a thread */
export async function getMessages(threadId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles(full_name, avatar_url)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
  if (error) { console.error('getMessages:', error); return [] }
  return data
}

/** Send a message */
export async function sendMessage(threadId: string, senderId: string, body: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ thread_id: threadId, sender_id: senderId, body })
    .select()
    .single()
  if (error) { console.error('sendMessage:', error); return null }
  return data
}

/** Subscribe to new messages in a thread (realtime) */
export function subscribeToThread(threadId: string, onMessage: (msg: any) => void) {
  return supabase
    .channel(`thread:${threadId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `thread_id=eq.${threadId}`
    }, payload => onMessage(payload.new))
    .subscribe()
}


// ─── REVIEWS ─────────────────────────────────────────────────────────────────

/** Submit a review */
export async function submitReview(review: {
  bookingId: string; guideId: string; guestId: string
  packageId?: string; rating: number; body: string; tripLabel?: string
}) {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      booking_id: review.bookingId, guide_id: review.guideId, guest_id: review.guestId,
      package_id: review.packageId, rating: review.rating, body: review.body,
      trip_label: review.tripLabel,
    })
    .select()
    .single()
  if (error) { console.error('submitReview:', error); return null }
  return data
}


// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────

/** Get the current user's profile + role */
export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data
}

/** Get the guide row for the current user (if they are a guide) */
export async function getCurrentGuide() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('guides').select('*').eq('profile_id', user.id).single()
  return data
}
