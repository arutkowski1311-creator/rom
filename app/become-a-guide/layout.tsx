import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Guide",
  description: "List your guide services on RŌM. Keep 100% of your price, get business tools, marketing support, and access to travelers worldwide. Apply in 5 minutes.",
  openGraph: {
    title: "Become a Guide | RŌM",
    description: "Keep 100% of your price. Get marketing, analytics, and business tools built for guides.",
    url: "https://romlife.co/become-a-guide",
  },
  alternates: { canonical: "https://romlife.co/become-a-guide" },
};

export default function BecomeGuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
