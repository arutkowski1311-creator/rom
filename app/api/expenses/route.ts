import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const guideId = req.nextUrl.searchParams.get("guideId");
    const year = req.nextUrl.searchParams.get("year") || new Date().getFullYear().toString();
    const bookingId = req.nextUrl.searchParams.get("bookingId");

    if (!guideId) {
      return NextResponse.json({ error: "guideId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("expenses")
      .select("*")
      .eq("guide_id", guideId)
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`)
      .order("date", { ascending: false });

    if (bookingId) {
      query = query.eq("booking_id", bookingId);
    }

    const { data: expenses, error } = await query;

    if (error) throw error;

    return NextResponse.json({ expenses: expenses || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guideId, category, amount, description, date, receiptUrl, mileage, taxDeductible, bookingId, recurringTemplateId } = body;

    if (!guideId || !category || !amount || !date) {
      return NextResponse.json({ error: "guideId, category, amount, and date required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        guide_id: guideId,
        category,
        amount,
        description: description || null,
        date,
        receipt_url: receiptUrl || null,
        mileage: mileage || null,
        tax_deductible: taxDeductible !== false,
        booking_id: bookingId || null,
        recurring_template_id: recurringTemplateId || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ expense: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
