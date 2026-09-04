// Public newsletter page. The id segment can be either a published public_slug
// or the raw content_pieces id (so guides can preview drafts via direct link
// without exposing them in search). Drafts only render to their owner via the
// dashboard; this page only renders rows that have status 'approved' or
// 'published' AND a public_slug, OR rows queried by uuid where status is
// approved.

import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/app/lib/supabase-server";
import { validateNewsletterContent } from "@/app/lib/newsletter-schema";
import { NewsletterRenderer } from "@/app/lib/newsletter-renderer";
import SubscribeForm from "@/app/components/SubscribeForm";
import type { Metadata } from "next";

interface Params {
  params: Promise<{ id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadNewsletter(idOrSlug: string) {
  const admin = getSupabaseAdmin();
  const isUuid = UUID_RE.test(idOrSlug);
  const query = admin
    .from("content_pieces")
    .select("id, guide_id, content_json, status, public_slug, subject, preheader")
    .eq("type", "newsletter")
    .in("status", ["approved", "published"]);
  const { data } = isUuid
    ? await query.eq("id", idOrSlug).maybeSingle()
    : await query.eq("public_slug", idOrSlug).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const row = await loadNewsletter(id);
  if (!row?.content_json) return { title: "Newsletter — RŌM" };
  try {
    const content = validateNewsletterContent(row.content_json);
    return {
      title: `${content.subject} — ${content.guide.name} · RŌM`,
      description: content.preheader,
      openGraph: {
        title: content.subject,
        description: content.preheader,
        images: content.guide.coverPhotoUrl ? [content.guide.coverPhotoUrl] : undefined,
      },
    };
  } catch {
    return { title: "Newsletter — RŌM" };
  }
}

export default async function NewsletterPage({ params }: Params) {
  const { id } = await params;
  const row = await loadNewsletter(id);
  if (!row?.content_json) notFound();

  let content;
  try {
    content = validateNewsletterContent(row.content_json);
  } catch {
    notFound();
  }

  // Someone reading a forwarded newsletter is the warmest possible lead, so
  // the opt-in sits directly under it rather than on some other page.
  return (
    <div style={{ background: "#e8e5df", minHeight: "100vh", padding: "32px 12px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <NewsletterRenderer content={content} maxWidth={640} />
        {row.guide_id && (
          <SubscribeForm
            guideId={row.guide_id}
            guideName={content.guide?.name}
            variant="paper"
            heading={content.guide?.name ? `More from ${content.guide.name.split(" ")[0]}` : "Get the next one"}
            blurb="Get the next one straight to your inbox."
          />
        )}
      </div>
    </div>
  );
}
