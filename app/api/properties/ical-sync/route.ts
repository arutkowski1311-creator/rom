import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

// Lightweight iCal VEVENT parser — no external dependencies
function parseIcal(text: string) {
  const events: { uid: string; start: string; end: string }[] = [];
  // Split into VEVENT blocks
  const vevents = text.split("BEGIN:VEVENT").slice(1);
  for (const block of vevents) {
    const lines = block.split(/\r?\n/);
    let uid = "", dtstart = "", dtend = "";
    for (const raw of lines) {
      const line = raw.replace(/\r/, "");
      if (line.startsWith("UID:"))     uid     = line.slice(4).trim();
      if (line.startsWith("DTSTART")) dtstart = line.split(":").slice(1).join(":").replace(/[TZ]/g, "").slice(0, 8);
      if (line.startsWith("DTEND"))   dtend   = line.split(":").slice(1).join(":").replace(/[TZ]/g, "").slice(0, 8);
    }
    if (uid && dtstart && dtend) {
      // Convert YYYYMMDD to YYYY-MM-DD
      const fmt = (d: string) => `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
      // iCal DTEND is exclusive — subtract 1 day
      const endDate = new Date(fmt(dtend));
      endDate.setDate(endDate.getDate() - 1);
      const endStr  = endDate.toISOString().slice(0, 10);
      const startStr = fmt(dtstart);
      events.push({ uid, start: startStr, end: endStr < startStr ? startStr : endStr });
    }
  }
  return events;
}

export async function POST(req: NextRequest) {
  try {
    const { property_id, feed_url, label } = await req.json();
    if (!property_id || !feed_url) {
      return NextResponse.json({ error: "property_id and feed_url required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch the iCal feed
    let icalText: string;
    try {
      const res = await fetch(feed_url, { headers: { "User-Agent": "ROM-Vacation-Rental/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      icalText = await res.text();
    } catch (fetchErr: any) {
      return NextResponse.json({ error: `Failed to fetch iCal feed: ${fetchErr.message}` }, { status: 400 });
    }

    const parsed = parseIcal(icalText);
    const source = label?.toLowerCase().includes("vrbo") ? "vrbo" : "airbnb";

    const blocks = parsed.map(e => ({
      property_id,
      start_date: e.start,
      end_date:   e.end,
      source,
      ical_uid:   e.uid,
    }));

    // Upsert blocks — dedup on ical_uid
    if (blocks.length > 0) {
      const { error: upsertErr } = await supabase
        .from("property_blocks")
        .upsert(blocks, { onConflict: "ical_uid" });
      if (upsertErr) throw upsertErr;
    }

    // Upsert feed record + update last_synced
    await supabase
      .from("property_ical_feeds")
      .upsert({ property_id, label, url: feed_url, last_synced: new Date().toISOString() }, { onConflict: "url" });

    return NextResponse.json({ synced: blocks.length, message: `Synced ${blocks.length} blocks from iCal feed` });
  } catch (err: any) {
    console.error("iCal sync error:", err);
    return NextResponse.json({ error: err.message || "iCal sync failed" }, { status: 500 });
  }
}
