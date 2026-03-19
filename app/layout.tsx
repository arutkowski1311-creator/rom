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
  title: "RŌM — Find Your Guide",
  description: "The marketplace for independent adventure guides. Fly fishing, hiking, climbing, diving, hunting — find a verified local guide and book your next trip.",
  openGraph: {
    title: "RŌM — Find Your Guide",
    description: "The marketplace for independent adventure guides.",
    siteName: "RŌM",
    url: "https://romlife.co",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RŌM — Find Your Guide",
    description: "The marketplace for independent adventure guides.",
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
