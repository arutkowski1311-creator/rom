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

async function getOrCreateStripeCustomer(userId: string, email: string) {
  const stripe = getStripe();
  const supabase = getSupabaseAdmin();

  // Check profile first
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Search Stripe by email
  const customers = await stripe.customers.list({ email, limit: 1 });
  let customerId: string;

  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
  } else {
    const customer = await stripe.customers.create({ email });
    customerId = customer.id;
  }

  // Save to profile
  await supabase
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId);

  return customerId;
}

// GET — List saved payment methods
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(user.id, user.email!);

    const methods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    // Get default payment method
    const customer = await stripe.customers.retrieve(customerId) as any;
    const defaultPM = customer.invoice_settings?.default_payment_method;

    return NextResponse.json({
      methods: methods.data.map((m: any) => ({
        id: m.id,
        brand: m.card?.brand,
        last4: m.card?.last4,
        exp_month: m.card?.exp_month,
        exp_year: m.card?.exp_year,
        isDefault: m.id === defaultPM,
      })),
    });
  } catch (err: any) {
    console.error("List payment methods error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// POST — Create SetupIntent to save a new card
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(user.id, user.email!);

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (err: any) {
    console.error("Create setup intent error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// DELETE — Remove a saved payment method
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) {
      return NextResponse.json({ error: "paymentMethodId required" }, { status: 400 });
    }

    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(user.id, user.email!);

    // Verify the payment method belongs to this customer
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== customerId) {
      return NextResponse.json({ error: "Not your payment method" }, { status: 403 });
    }

    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete payment method error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
