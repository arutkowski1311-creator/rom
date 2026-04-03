import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const {
      bookingId,
      rentalId,
      guestId,
      guestLegalName,
      guestEmail,
      signatureText,
      emergencyContactName,
      emergencyContactPhone,
      participantCount,
      minorParticipants,
      waiverContent,
    } = await req.json();

    if (!bookingId || !guestLegalName || !signatureText) {
      return NextResponse.json({ error: "bookingId, guestLegalName, and signatureText required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: waiver, error } = await supabase
      .from("rental_signed_waivers")
      .insert({
        rental_booking_id:      bookingId,
        rental_id:              rentalId,
        guest_id:               guestId,
        waiver_version:         "1.0",
        waiver_content:         waiverContent,
        guest_legal_name:       guestLegalName,
        guest_email:            guestEmail || null,
        signature_text:         signatureText,
        signed_at:              new Date().toISOString(),
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone:emergencyContactPhone || null,
        participant_count:      participantCount || 1,
        minor_participants:     minorParticipants || [],
      })
      .select()
      .single();

    if (error) throw error;

    // Update booking record
    await supabase
      .from("rental_bookings")
      .update({
        waiver_signed:    true,
        waiver_signed_at: new Date().toISOString(),
        waiver_id:        waiver.id,
        guest_legal_name: guestLegalName,
        emergency_contact: `${emergencyContactName || ""} ${emergencyContactPhone || ""}`.trim() || null,
      })
      .eq("id", bookingId);

    return NextResponse.json({ success: true, waiverId: waiver.id });
  } catch (err: any) {
    console.error("Sign waiver error:", err);
    return NextResponse.json({ error: err.message || "Failed to record waiver" }, { status: 500 });
  }
}
