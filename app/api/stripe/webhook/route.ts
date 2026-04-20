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

  // Idempotency: skip already-processed events
  const { data: existing } = await supabase
    .from("stripe_events")
    .select("event_id")
    .eq("event_id", event.id)
    .single();

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Record event before processing (ON CONFLICT handles race conditions)
  await supabase
    .from("stripe_events")
    .upsert(
      { event_id: event.id, event_type: event.type },
      { onConflict: "event_id" }
    );

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
          } else if (type === "tip") {
            updates.tip_paid_at = new Date().toISOString();
            updates.tip_payment_id = pi.id;
            updates.tip_amount = (pi.amount || 0) / 100;
            // Notify guide about the tip
            const guideId = pi.metadata?.guide_id;
            if (guideId) {
              await supabase.from("guide_notifications").insert({
                guide_id: guideId,
                type: "tip_received",
                title: `You received a tip!`,
                body: `A guest left you a $${((pi.amount || 0) / 100).toFixed(2)} tip. Great work!`,
                metadata: { booking_id: bookingId },
              });
            }
          }
          if (Object.keys(updates).length > 0) {
            await supabase.from("bookings").update(updates).eq("id", bookingId);
          }

          // Referral reward: on first deposit payment, credit both referrer and referee
          if (type === "deposit" && bookingId) {
            try {
              const { data: booking } = await supabase
                .from("bookings")
                .select("guest_id")
                .eq("id", bookingId)
                .single();

              if (booking?.guest_id) {
                const { data: guestProfile } = await supabase
                  .from("profiles")
                  .select("id, referred_by")
                  .eq("id", booking.guest_id)
                  .single();

                if (guestProfile?.referred_by) {
                  // Check if first_booking reward already issued
                  const { data: existingReward } = await supabase
                    .from("referral_events")
                    .select("id")
                    .eq("referee_id", guestProfile.id)
                    .eq("event_type", "first_booking")
                    .limit(1);

                  if (!existingReward || existingReward.length === 0) {
                    const REFERRER_REWARD = 2500; // $25
                    const REFEREE_REWARD = 1500;  // $15

                    // Create first_booking events
                    const { data: referrerEvent } = await supabase
                      .from("referral_events")
                      .insert({
                        referrer_id: guestProfile.referred_by,
                        referee_id: guestProfile.id,
                        event_type: "first_booking",
                        reward_amount: REFERRER_REWARD,
                        booking_id: bookingId,
                        status: "credited",
                      })
                      .select("id")
                      .single();

                    // Credit referrer
                    await supabase.from("referral_credits").insert({
                      profile_id: guestProfile.referred_by,
                      amount: REFERRER_REWARD,
                      source_event_id: referrerEvent?.id,
                      description: "Referral reward — friend's first booking",
                    });

                    // Credit referee
                    await supabase.from("referral_credits").insert({
                      profile_id: guestProfile.id,
                      amount: REFEREE_REWARD,
                      source_event_id: referrerEvent?.id,
                      description: "Welcome reward — first booking with referral",
                    });
                  }
                }
              }
            } catch (refErr) {
              console.error("Referral reward error (non-blocking):", refErr);
            }
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
        const invoice = event.data.object;
        const groupBookingId = invoice.metadata?.group_booking_id;
        if (groupBookingId) {
          // Group booking invoice paid — update status
          await supabase.from("group_bookings").update({
            status: "paid",
            updated_at: new Date().toISOString(),
          }).eq("id", groupBookingId);

          // Notify guide
          const guideId = invoice.metadata?.guide_id;
          if (guideId) {
            await supabase.from("guide_notifications").insert({
              guide_id: guideId,
              type: "group_payment",
              title: "Group booking payment received",
              body: `Invoice for group booking has been paid.`,
              metadata: { group_booking_id: groupBookingId },
            });
          }
        }
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

      case "setup_intent.succeeded": {
        // When a guest saves a card, auto-set as default if it's their first
        const si = event.data.object;
        const customerId = si.customer as string;
        if (customerId && si.payment_method) {
          const customer = await stripe.customers.retrieve(customerId) as any;
          if (!customer.invoice_settings?.default_payment_method) {
            await stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: si.payment_method as string },
            });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
