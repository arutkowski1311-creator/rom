// Thin wrapper around Unsplash search. Falls back to empty array if no key
// is configured so the rest of the app keeps working.

export async function fetchStockPhotos(query: string, count = 6): Promise<string[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((p: { urls?: { regular?: string } }) => p.urls?.regular).filter(Boolean) as string[];
  } catch {
    return [];
  }
}
