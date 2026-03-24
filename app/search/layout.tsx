import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find a Guide",
  description: "Browse verified adventure guides by location, activity, and price. Fly fishing, hiking, rock climbing, hunting, diving, and more. Book directly with no middlemen.",
  openGraph: {
    title: "Find a Guide | RŌM",
    description: "Browse verified adventure guides. Book directly with no middlemen.",
    url: "https://romlife.co/search",
  },
  alternates: { canonical: "https://romlife.co/search" },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
