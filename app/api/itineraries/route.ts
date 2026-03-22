import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const bookingId = req.nextUrl.searchParams.get("booking_id");
    const guideId = req.nextUrl.searchParams.get("guide_id");

    let query = supabase.from("itineraries").select("*");

    if (bookingId) {
      query = query.eq("booking_id", bookingId);
      const { data } = await query.single();
      if (data) {
        // Fetch guide info for display
        const { data: guide } = await supabase.from("guides").select("slug, location, profile_photo_url, profile_id, categories").eq("id", data.guide_id).single();
        if (guide) {
          const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", guide.profile_id).single();
          (data as any).guide_name = profile?.full_name || "Guide";
          (data as any).guide_photo = guide.profile_photo_url || null;
          (data as any).guide_slug = guide.slug || "";
          (data as any).guide_location = guide.location || "";
          (data as any).guide_categories = guide.categories || [];
        }
      }
      return NextResponse.json(data || null);
    }

    if (guideId) {
      query = query.eq("guide_id", guideId).order("generated_at", { ascending: false });
      const { data } = await query;
      return NextResponse.json(data || []);
    }

    return NextResponse.json({ error: "booking_id or guide_id required" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { id, content, status } = await req.json();

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const updates: any = { last_edited_at: new Date().toISOString() };
    if (content) updates.content = content;
    if (status === "published") {
      updates.status = "published";
      updates.published_at = new Date().toISOString();
    } else if (status) {
      updates.status = status;
    }

    const { data, error } = await supabase
      .from("itineraries")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
