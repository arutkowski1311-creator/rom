import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { tripPlanId, refinement } = await req.json();

    if (!tripPlanId || !refinement) {
      return NextResponse.json({ error: "tripPlanId and refinement required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: plan } = await supabase
      .from("trip_plans")
      .select("*")
      .eq("id", tripPlanId)
      .single();

    if (!plan) {
      return NextResponse.json({ error: "Trip plan not found" }, { status: 404 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: `You are a premium trip concierge for RŌM. You have an existing trip itinerary and the guest wants to refine it. Update the itinerary based on their request while keeping the same JSON structure. Only change what's necessary — preserve everything else. Return the complete updated itinerary as valid JSON.`,
      messages: [
        { role: "user", content: `Current itinerary:\n${JSON.stringify(plan.itinerary, null, 2)}\n\nGuest request: ${refinement}` },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let updatedItinerary;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      updatedItinerary = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      updatedItinerary = null;
    }

    if (!updatedItinerary) {
      return NextResponse.json({ error: "Failed to refine itinerary" }, { status: 500 });
    }

    // Update trip plan
    const history = Array.isArray(plan.refinement_history) ? plan.refinement_history : [];
    history.push({ prompt: refinement, timestamp: new Date().toISOString() });

    await supabase.from("trip_plans").update({
      itinerary: updatedItinerary,
      refinement_history: history,
      updated_at: new Date().toISOString(),
    }).eq("id", tripPlanId);

    return NextResponse.json({ itinerary: updatedItinerary });
  } catch (err: any) {
    console.error("Concierge refine error:", err);
    return NextResponse.json({ error: err.message || "Failed to refine" }, { status: 500 });
  }
}
