import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Category mapping — vendor types to expense categories
const CATEGORY_HINTS: Record<string, string> = {
  "gas": "Fuel", "fuel": "Fuel", "shell": "Fuel", "chevron": "Fuel", "exxon": "Fuel",
  "bp": "Fuel", "costco gas": "Fuel", "maverick": "Fuel", "pilot": "Fuel", "casey": "Fuel",
  "restaurant": "Food & Meals", "cafe": "Food & Meals", "diner": "Food & Meals",
  "grill": "Food & Meals", "pizza": "Food & Meals", "coffee": "Food & Meals",
  "starbucks": "Food & Meals", "subway": "Food & Meals", "mcdonald": "Food & Meals",
  "walmart": "Supplies", "target": "Supplies", "home depot": "Supplies",
  "bass pro": "Gear", "cabela": "Gear", "rei": "Gear", "orvis": "Gear",
  "fly shop": "Gear", "tackle": "Gear", "bait": "Gear",
  "parking": "Parking & Tolls", "marina": "Parking & Tolls", "launch": "Parking & Tolls", "toll": "Parking & Tolls",
  "insurance": "Insurance", "license": "License & Permits", "permit": "License & Permits",
  "mechanic": "Repairs & Maintenance", "tire": "Vehicle", "auto": "Vehicle", "oil change": "Vehicle",
  "hotel": "Travel & Lodging", "motel": "Travel & Lodging", "airbnb": "Travel & Lodging", "lodge": "Travel & Lodging", "inn": "Travel & Lodging",
  "verizon": "Phone & Internet", "t-mobile": "Phone & Internet", "at&t": "Phone & Internet", "comcast": "Phone & Internet",
  "storage": "Rent & Storage", "dock": "Rent & Storage", "slip": "Rent & Storage", "marina fee": "Rent & Storage",
  "accountant": "Professional Services", "attorney": "Professional Services", "lawyer": "Professional Services", "cpa": "Professional Services",
  "course": "Education & Training", "certification": "Education & Training", "training": "Education & Training", "nols": "Education & Training",
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("receipt") as File;

    if (!file) {
      return NextResponse.json({ error: "No receipt image provided" }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    // Send to Claude vision
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Read this receipt and extract the following information. Return ONLY valid JSON, no markdown, no preamble.

{
  "vendor": "Store/business name",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "description": "Brief 3-5 word description of what was purchased",
  "category": "One of: Fuel, Vehicle, Parking & Tolls, Insurance, Gear, Supplies, Food & Meals, Travel & Lodging, Marketing, Software, Phone & Internet, License & Permits, Rent & Storage, Repairs & Maintenance, Contract Labor, Professional Services, Education & Training, Other",
  "items": ["List of main items if visible"],
  "tax": 0.00,
  "confidence": "high/medium/low"
}

Rules:
- "amount" must be the TOTAL amount paid (including tax)
- If you cannot read a field clearly, use null
- "date" should be the receipt date, not today
- "category" should be your best guess based on the vendor and items
- "confidence" reflects how well you could read the receipt overall
- Return ONLY the JSON object, nothing else`
            }
          ]
        }
      ]
    });

    // Parse the AI response
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let parsed;
    try {
      // Clean any markdown wrapping
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({
        error: "Could not parse receipt",
        raw: text,
        suggestion: "Try taking a clearer photo with better lighting"
      }, { status: 422 });
    }

    // Enhance category if AI wasn't specific enough
    if (parsed.vendor && parsed.category === "Other") {
      const vendorLower = parsed.vendor.toLowerCase();
      for (const [hint, cat] of Object.entries(CATEGORY_HINTS)) {
        if (vendorLower.includes(hint)) {
          parsed.category = cat;
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      expense: {
        vendor: parsed.vendor || null,
        amount: typeof parsed.amount === "number" ? parsed.amount : null,
        date: parsed.date || new Date().toISOString().split("T")[0],
        description: parsed.description || (parsed.vendor ? `Purchase at ${parsed.vendor}` : null),
        category: parsed.category || "Other",
        items: parsed.items || [],
        tax: typeof parsed.tax === "number" ? parsed.tax : null,
        confidence: parsed.confidence || "medium",
      }
    });
  } catch (e: any) {
    console.error("Receipt scan error:", e);
    return NextResponse.json({ error: e.message || "Failed to scan receipt" }, { status: 500 });
  }
}
