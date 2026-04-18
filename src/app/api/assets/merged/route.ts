import { NextRequest, NextResponse } from "next/server";
import { NormalizedVideoAsset } from "@/types/assets";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  const orientation = req.nextUrl.searchParams.get("orientation") || "landscape";

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

  // Results containers
  let pexelsNormalized: NormalizedVideoAsset[] = [];
  let pixabayNormalized: NormalizedVideoAsset[] = [];

  try {
    // Helper for fetch with timeout
    const fetchWithTimeout = async (url: string, timeout = 3000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    };

    // 1. Parallel Fetch with individual isolation
    await Promise.allSettled([
      (async () => {
        try {
          const res = await fetchWithTimeout(`${baseUrl}/api/assets/pexels?query=${encodeURIComponent(query)}&orientation=${orientation}`);
          if (res.ok) {
            const data = await res.json();
            pexelsNormalized = (data.videos || []).map((v: any) => ({
              id: v.id,
              source: 'pexels',
              thumbnail: v.image,
              videoUrl: v.video_files?.[0]?.link || "",
              originalUrl: v.url,
              author: v.user?.name || "Pexels Artist",
              width: v.width,
              height: v.height
            }));
          }
        } catch (e) { console.error("Merged: Pexels timeout/error", e); }
      })(),
      (async () => {
        try {
          const res = await fetchWithTimeout(`${baseUrl}/api/assets/pixabay?query=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            pixabayNormalized = data.videos || [];
          }
        } catch (e) { console.error("Merged: Pixabay timeout/error", e); }
      })()
    ]);

    // 2. Interleave Results
    const maxLength = Math.max(pexelsNormalized.length, pixabayNormalized.length);
    const interleaved: NormalizedVideoAsset[] = [];

    for (let i = 0; i < maxLength; i++) {
        if (i < pexelsNormalized.length) interleaved.push(pexelsNormalized[i]);
        if (i < pixabayNormalized.length) interleaved.push(pixabayNormalized[i]);
    }

    return NextResponse.json({
      query,
      videos: interleaved
    });
  } catch (error) {
    console.error("Critical Merged Assets Error:", error);
    return NextResponse.json({ query, videos: [] });
  }
}
