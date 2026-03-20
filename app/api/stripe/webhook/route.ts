import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const supabase = getSupabaseAdmin();

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const bookingId = pi.metadata?.booking_id;
        const type = pi.metadata?.type;

        // Update payment record
        await supabase
          .from("payments")
          .update({ status: "succeeded", updated_at: new Date().toISOString() })
          .eq("stripe_payment_intent_id", pi.id);

        // Update booking
        if (bookingId) {
          const updates: Record<string, any> = {};
          if (type === "deposit") {
            updates.deposit_paid_at = new Date().toISOString();
            updates.status = "deposit_paid";
          } else if (type === "balance") {
            updates.balance_paid_at = new Date().toISOString();
          }
          if (Object.keys(updates).length > 0) {
            await supabase.from("bookings").update(updates).eq("id", bookingId);
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        await supabase
          .from("payments")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("stripe_payment_intent_id", pi.id);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const guideStripeCustomerId = sub.customer;

        // Map Stripe price to tier
        const priceToTier: Record<string, string> = {};
        if (process.env.STRIPE_PRICE_DISCOVER) priceToTier[process.env.STRIPE_PRICE_DISCOVER] = "discover";
        if (process.env.STRIPE_PRICE_IMMERSE) priceToTier[process.env.STRIPE_PRICE_IMMERSE] = "immerse";

        const priceId = sub.items?.data?.[0]?.price?.id;
        const newTier = priceId ? priceToTier[priceId] : undefined;

        const updates: Record<string, any> = {
          subscription_status: sub.status === "active" ? "active" : sub.status,
          stripe_subscription_id: sub.id,
        };
        if (newTier) updates.subscription_tier = newTier;

        await supabase
          .from("guides")
          .update(updates)
          .eq("stripe_customer_id", guideStripeCustomerId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await supabase
          .from("guides")
          .update({
            subscription_status: "cancelled",
            subscription_tier: "spark",
          })
          .eq("stripe_customer_id", sub.customer);
        break;
      }

      case "invoice.paid": {
        // Subscription payment succeeded — could log to guide_billing
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await supabase
          .from("guides")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", invoice.customer);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
