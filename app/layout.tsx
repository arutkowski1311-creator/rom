import type { Metadata } from "next";
import { Cormorant_Garamond, Barlow } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const barlow = Barlow({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://romlife.co"),
  title: {
    default: "RŌM — Find Your Guide",
    template: "%s | RŌM",
  },
  description: "The marketplace for independent adventure guides. Fly fishing, hiking, climbing, diving, hunting — find a verified local guide and book your next trip.",
  keywords: ["adventure guide", "fly fishing guide", "hiking guide", "outdoor guide marketplace", "book a guide", "fishing trips", "climbing guide", "hunting guide"],
  openGraph: {
    title: "RŌM — Find Your Guide",
    description: "The world's best adventure guides, in one place. Book directly with verified local guides.",
    siteName: "RŌM",
    url: "https://romlife.co",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "RŌM — Find Your Guide",
    description: "The world's best adventure guides, in one place.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://romlife.co",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${barlow.variable}`}>
        {children}
      </body>
    </html>
  );
}
