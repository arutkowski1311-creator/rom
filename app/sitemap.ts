import { createClient } from "@supabase/supabase-js";
import { MetadataRoute } from "next";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://romlife.co";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/concierge`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/become-a-guide`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Dynamic guide profile pages
  let guidePages: MetadataRoute.Sitemap = [];
  try {
    const { data: guides } = await supabase
      .from("guides")
      .select("slug, updated_at")
      .eq("status", "active")
      .not("slug", "is", null);

    if (guides) {
      guidePages = guides.map((g) => ({
        url: `${baseUrl}/guides/${g.slug}`,
        lastModified: g.updated_at ? new Date(g.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch (e) {
    console.error("Sitemap guide fetch error:", e);
  }

  return [...staticPages, ...guidePages];
}
