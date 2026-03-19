import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

const TIER_PRICES: Record<string, string> = {
  trail: process.env.STRIPE_PRICE_TRAIL || "",
  pro: process.env.STRIPE_PRICE_PRO || "",
  elite: process.env.STRIPE_PRICE_ELITE || "",
};

export async function POST(req: NextRequest) {
  try {
    const { guideId, tier, paymentMethodId } = await req.json();

    if (!guideId || !tier || !TIER_PRICES[tier]) {
      return NextResponse.json({ error: "guideId and valid tier required" }, { status: 400 });
    }

    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    // Get guide data
    const { data: guide } = await supabase
      .from("guides")
      .select("stripe_customer_id, email, profile_id")
      .eq("id", guideId)
      .single();

    if (!guide) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }

    // Get or create Stripe Customer
    let customerId = guide.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: guide.email,
        metadata: { guide_id: guideId },
      });
      customerId = customer.id;
      await supabase
        .from("guides")
        .update({ stripe_customer_id: customerId })
        .eq("id", guideId);
    }

    // Attach payment method if provided
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    // Check for existing subscription
    if (guide.stripe_customer_id) {
      const existingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (existingSubs.data.length > 0) {
        // Update existing subscription to new tier
        const sub = existingSubs.data[0];
        const updated = await stripe.subscriptions.update(sub.id, {
          items: [{ id: sub.items.data[0].id, price: TIER_PRICES[tier] }],
          proration_behavior: "create_prorations",
        });

        await supabase.from("guides").update({
          subscription_tier: tier,
          stripe_subscription_id: updated.id,
          subscription_status: "active",
          tier_started_at: new Date().toISOString(),
        }).eq("id", guideId);

        return NextResponse.json({ subscriptionId: updated.id, status: "updated" });
      }
    }

    // Create new subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: TIER_PRICES[tier] }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    // Update guide record
    await supabase.from("guides").update({
      subscription_tier: tier,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      subscription_status: subscription.status === "active" ? "active" : "trialing",
      tier_started_at: new Date().toISOString(),
      billing_cycle_start: new Date().toISOString(),
    }).eq("id", guideId);

    // Get client secret for payment confirmation
    const invoice = subscription.latest_invoice as any;
    const clientSecret = invoice?.payment_intent?.client_secret;

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
      status: subscription.status,
    });
  } catch (err: any) {
    console.error("Create subscription error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}
