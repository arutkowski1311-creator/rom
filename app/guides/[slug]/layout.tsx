import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { data: guide } = await supabase
      .from("guides")
      .select("slug, tagline, bio, location, categories, rating, review_count, profile_photo_url, profile_id")
      .eq("slug", slug)
      .single();

    if (!guide) {
      return { title: "Guide Not Found" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", guide.profile_id)
      .single();

    const name = profile?.full_name || "Guide";
    const activity = guide.categories?.[0] || "Adventure";
    const location = guide.location || "";
    const description = guide.tagline || guide.bio?.substring(0, 155) || `${activity} guide in ${location}`;
    const title = `${name} — ${activity} Guide in ${location}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "profile",
        url: `https://romlife.co/guides/${slug}`,
        ...(guide.profile_photo_url && { images: [{ url: guide.profile_photo_url, width: 400, height: 400, alt: name }] }),
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
      alternates: {
        canonical: `https://romlife.co/guides/${slug}`,
      },
      other: {
        // JSON-LD structured data injected via script tag in page
        "guide:rating": guide.rating?.toString() || "",
        "guide:reviewCount": guide.review_count?.toString() || "0",
      },
    };
  } catch (e) {
    return { title: "Guide Profile | RŌM" };
  }
}

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
