import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      bookingId,
      guestName,       // legal name
      guestEmail,
      signatureText,   // typed signature
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      medicalNotes,
      minorParticipants,
    } = body;

    if (!bookingId || !guestName || !signatureText) {
      return NextResponse.json({ error: "bookingId, guestName, and signatureText required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch booking
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, guide_id, guest_id, package_title, trip_date, guest_name")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if already signed
    const { data: existing } = await supabase
      .from("signed_waivers")
      .select("id")
      .eq("booking_id", bookingId)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Waiver already signed for this booking" }, { status: 400 });
    }

    // Find applicable waiver template
    const { data: template } = await supabase
      .from("waiver_templates")
      .select("*")
      .eq("guide_id", booking.guide_id)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Use template content or default waiver
    const waiverContent = template?.content || DEFAULT_WAIVER;

    // Get client IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("x-real-ip") || "unknown";

    // Create signed waiver record
    const { data: signedWaiver, error } = await supabase
      .from("signed_waivers")
      .insert({
        booking_id: bookingId,
        guide_id: booking.guide_id,
        guest_id: booking.guest_id,
        template_id: template?.id || null,
        waiver_content: waiverContent,
        guest_name: guestName,
        guest_email: guestEmail || null,
        signature_text: signatureText,
        signature_ip: ip,
        signed_at: new Date().toISOString(),
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone: emergencyContactPhone || null,
        emergency_contact_relation: emergencyContactRelation || null,
        medical_notes: medicalNotes || null,
        minor_participants: minorParticipants || [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update booking
    await supabase
      .from("bookings")
      .update({
        waiver_signed: true,
        waiver_signed_at: new Date().toISOString(),
        waiver_id: signedWaiver.id,
      })
      .eq("id", bookingId);

    // Get guide name for notification
    const { data: guide } = await supabase
      .from("guides")
      .select("profile_id")
      .eq("id", booking.guide_id)
      .single();
    const { data: guideProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", guide?.profile_id)
      .single();

    // Notify guide
    await supabase.from("guide_notifications").insert({
      guide_id: booking.guide_id,
      type: "waiver_signed",
      title: `${guestName} signed the waiver`,
      body: `${booking.package_title || "Trip"} on ${new Date(booking.trip_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}. Emergency contact: ${emergencyContactName || "not provided"}.`,
      metadata: { booking_id: bookingId, waiver_id: signedWaiver.id },
    });

    // Send confirmation email to guest
    if (guestEmail) {
      const guideName = guideProfile?.full_name || "your guide";
      await resend.emails.send({
        from: "RŌM <bookings@romlife.co>",
        to: guestEmail,
        subject: `Waiver signed — ${booking.package_title || "your trip"}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
            <div style="background: #0d0d0d; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
              <div style="font-size: 28px; letter-spacing: 0.12em; color: #c9a96e; font-weight: 300;">RŌM</div>
            </div>
            <div style="background: #f9f7f4; padding: 36px; border-radius: 0 0 8px 8px;">
              <h1 style="font-size: 22px; font-weight: 500; margin: 0 0 8px;">Waiver signed ✓</h1>
              <p style="color: #555; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
                Your liability waiver for ${booking.package_title || "your trip"} with ${guideName} on ${new Date(booking.trip_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} has been recorded.
              </p>
              <div style="background: #fff; border: 1px solid #e5e0d8; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <div style="font-size: 12px; color: #999; margin-bottom: 4px;">Signed by</div>
                <div style="font-size: 15px; font-weight: 600; color: #1a1a1a;">${guestName}</div>
                <div style="font-size: 12px; color: #999; margin-top: 8px;">Signature</div>
                <div style="font-size: 18px; font-style: italic; color: #1a1a1a; font-family: cursive;">${signatureText}</div>
                <div style="font-size: 12px; color: #999; margin-top: 8px;">Date</div>
                <div style="font-size: 13px; color: #1a1a1a;">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</div>
              </div>
              <p style="color: #888; font-size: 12px; line-height: 1.6; margin: 0;">
                A copy of this waiver is stored in your RŌM account. You can access it anytime from your dashboard.
              </p>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true, waiverId: signedWaiver.id });
  } catch (err: any) {
    console.error("Waiver signing error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

const DEFAULT_WAIVER = `ASSUMPTION OF RISK AND LIABILITY WAIVER

I, the undersigned participant, acknowledge and agree to the following:

1. ASSUMPTION OF RISK
I understand that outdoor adventure activities including but not limited to fishing, hiking, climbing, kayaking, diving, hunting, and related activities involve inherent risks including but not limited to: physical injury, property damage, exposure to weather, wildlife encounters, water hazards, uneven terrain, and other natural conditions. I voluntarily assume all risks associated with my participation.

2. RELEASE OF LIABILITY
I hereby release, waive, and discharge the guide, their business, RŌM Inc., and their respective officers, agents, and employees from any and all liability, claims, demands, or causes of action arising from my participation in the guided experience, except in cases of gross negligence or willful misconduct.

3. MEDICAL ACKNOWLEDGMENT
I confirm that I am physically capable of participating in the planned activity. I have disclosed any relevant medical conditions, allergies, or physical limitations that may affect my participation or require accommodation.

4. MINOR PARTICIPANTS
If I am signing on behalf of a minor participant (under 18), I am their parent or legal guardian and I accept these terms on their behalf.

5. PHOTO/VIDEO RELEASE
I grant the guide and RŌM permission to use photographs and video taken during the experience for promotional and marketing purposes, unless I opt out in writing before the trip.

6. CANCELLATION & WEATHER
I understand that trips may be rescheduled due to unsafe weather or conditions at the guide's discretion. Cancellation policies are as stated at the time of booking.

7. GOVERNING LAW
This waiver shall be governed by the laws of the state in which the activity takes place.

By signing below, I confirm that I have read and understand this waiver, that I am at least 18 years old (or signing as parent/guardian of a minor), and that I agree to all terms.`;
