import { Metadata } from "next";

export const metadata: Metadata = {
  title: "RŌM Concierge",
  description: "Tell us where you want to go. Our AI concierge builds a custom adventure itinerary — guides, lodging, dining, and logistics — in under a minute.",
  openGraph: {
    title: "RŌM Concierge — Your Trip, Designed",
    description: "AI-powered trip planning with handpicked adventure guides.",
    url: "https://romlife.co/concierge",
  },
  alternates: { canonical: "https://romlife.co/concierge" },
};

export default function ConciergeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
