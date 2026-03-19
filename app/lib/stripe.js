import Stripe from "stripe";

let stripe = null;

export function getStripe() {
  if (stripe) return stripe;
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}
