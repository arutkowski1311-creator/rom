import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

// GET: Fetch waiver templates for a guide, or a specific waiver for a booking
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const guideId = req.nextUrl.searchParams.get("guideId");
    const bookingId = req.nextUrl.searchParams.get("bookingId");

    // Fetch signed waiver for a booking
    if (bookingId) {
      const { data: waiver } = await supabase
        .from("signed_waivers")
        .select("*")
        .eq("booking_id", bookingId)
        .single();
      return NextResponse.json({ waiver });
    }

    // Fetch waiver templates for a guide
    if (guideId) {
      const { data: templates } = await supabase
        .from("waiver_templates")
        .select("*")
        .eq("guide_id", guideId)
        .eq("active", true)
        .order("created_at", { ascending: false });
      return NextResponse.json({ templates: templates || [] });
    }

    return NextResponse.json({ error: "guideId or bookingId required" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create or update a waiver template
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guideId, name, content, activityType, requiresEmergencyContact, requiresMedicalDisclosure, templateId } = body;

    if (!guideId || !content) {
      return NextResponse.json({ error: "guideId and content required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (templateId) {
      // Update existing template
      const { data, error } = await supabase
        .from("waiver_templates")
        .update({
          name: name || "Standard Liability Waiver",
          content,
          activity_type: activityType || null,
          requires_emergency_contact: requiresEmergencyContact ?? true,
          requires_medical_disclosure: requiresMedicalDisclosure ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ template: data });
    }

    // Create new template
    const { data, error } = await supabase
      .from("waiver_templates")
      .insert({
        guide_id: guideId,
        name: name || "Standard Liability Waiver",
        content,
        activity_type: activityType || null,
        requires_emergency_contact: requiresEmergencyContact ?? true,
        requires_medical_disclosure: requiresMedicalDisclosure ?? false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ template: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Deactivate a waiver template
export async function DELETE(req: NextRequest) {
  try {
    const { templateId } = await req.json();
    if (!templateId) return NextResponse.json({ error: "templateId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    await supabase
      .from("waiver_templates")
      .update({ active: false })
      .eq("id", templateId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
