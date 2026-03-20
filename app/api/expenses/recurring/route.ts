import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const guideId = req.nextUrl.searchParams.get("guideId");
    if (!guideId) {
      return NextResponse.json({ error: "guideId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("recurring_expenses")
      .select("*")
      .eq("guide_id", guideId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ templates: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guideId, category, amount, description, frequency } = body;

    if (!guideId || !category || !amount) {
      return NextResponse.json({ error: "guideId, category, and amount required" }, { status: 400 });
    }

    const validFrequencies = ["monthly", "weekly", "quarterly"];
    const freq = validFrequencies.includes(frequency) ? frequency : "monthly";

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("recurring_expenses")
      .insert({
        guide_id: guideId,
        category,
        amount: parseFloat(amount),
        description: description || null,
        frequency: freq,
        active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ template: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, active, lastLogged } = body;

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const updates: any = {};
    if (typeof active === "boolean") updates.active = active;
    if (lastLogged) updates.last_logged = lastLogged;

    const { data, error } = await supabase
      .from("recurring_expenses")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ template: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
