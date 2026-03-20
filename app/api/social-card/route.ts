import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const destination = searchParams.get("destination") || "adventure";

  // Use Unsplash Source for a random destination photo (no API key needed)
  const query = encodeURIComponent(`${destination} travel landscape`);
  const imageUrl = `https://source.unsplash.com/1080x1920/?${query}`;

  // Fetch the actual redirect URL from Unsplash
  try {
    const res = await fetch(imageUrl, { redirect: "follow" });
    const finalUrl = res.url;
    return NextResponse.json({ imageUrl: finalUrl });
  } catch {
    // Fallback: return the source URL directly (browser will follow redirect)
    return NextResponse.json({ imageUrl });
  }
}
