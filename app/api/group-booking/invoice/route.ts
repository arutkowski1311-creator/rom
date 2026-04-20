import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

async function getAuthUser(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: req.headers.get("authorization") || "" } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// POST — Generate and send Stripe invoice for a group booking
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupBookingId } = await req.json();
    if (!groupBookingId) return NextResponse.json({ error: "groupBookingId required" }, { status: 400 });

    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    // Fetch group booking
    const { data: gb } = await supabase
      .from("group_bookings")
      .select("*")
      .eq("id", groupBookingId)
      .single();

    if (!gb) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (gb.status !== "accepted" && gb.status !== "quoted") {
      return NextResponse.json({ error: "Group booking must be accepted/quoted to invoice" }, { status: 400 });
    }
    if (!gb.quoted_total) {
      return NextResponse.json({ error: "Set a quoted total before invoicing" }, { status: 400 });
    }

    // Get guide's Stripe account
    const { data: guide } = await supabase
      .from("guides")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("id", gb.guide_id)
      .single();

    if (!guide?.stripe_account_id) {
      return NextResponse.json({ error: "Guide has no Stripe account" }, { status: 400 });
    }

    // Get or create Stripe customer for billing email
    const customers = await stripe.customers.list({ email: gb.billing_email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: gb.billing_email,
        name: gb.company_name || gb.group_name,
      });
      customerId = customer.id;
    }

    // Service fee split
    const SERVICE_FEE_RATE = 0.15;
    const totalCents = gb.quoted_total;
    const guidePortion = Math.round(totalCents / (1 + SERVICE_FEE_RATE));

    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: 30,
      transfer_data: {
        destination: guide.stripe_account_id,
        amount: guidePortion,
      },
      metadata: {
        group_booking_id: groupBookingId,
        guide_id: gb.guide_id,
      },
    });

    // Add line item
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      amount: totalCents,
      currency: "usd",
      description: `Group booking: ${gb.group_name} — ${gb.headcount} guests`,
    });

    // Finalize and send
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(invoice.id);

    // Update group booking
    await supabase.from("group_bookings").update({
      stripe_invoice_id: invoice.id,
      status: "invoiced",
      payment_due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    }).eq("id", groupBookingId);

    return NextResponse.json({
      invoiceId: invoice.id,
      invoiceUrl: finalizedInvoice.hosted_invoice_url,
      total: totalCents,
    });
  } catch (err: any) {
    console.error("Group invoice error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
