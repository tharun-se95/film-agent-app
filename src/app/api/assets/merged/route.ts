import { NextRequest, NextResponse } from "next/server";
import { NormalizedVideoAsset } from "@/types/assets";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  const orientation = req.nextUrl.searchParams.get("orientation") || "landscape";
  const type = req.nextUrl.searchParams.get("type") || "video"; // 'video' or 'image'

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

  // Results containers
  let pexelsNormalized: any[] = [];
  let pixabayNormalized: any[] = [];

  try {
    const fetchWithTimeout = async (url: string, timeout = 5000) => {
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

    await Promise.allSettled([
      (async () => {
        try {
          const res = await fetchWithTimeout(`${baseUrl}/api/assets/pexels?query=${encodeURIComponent(query)}&orientation=${orientation}&type=${type}`);
          if (res.ok) {
            const data = await res.json();
            if (type === "video") {
              pexelsNormalized = (data.videos || []).map((v: any) => ({
                id: v.id,
                source: 'pexels',
                type: 'video',
                thumbnail: v.image,
                videoUrl: v.video_files?.[0]?.link || "",
                originalUrl: v.url,
                author: v.user?.name || "Pexels Artist",
                width: v.width,
                height: v.height
              }));
            } else {
              pexelsNormalized = (data.photos || []).map((p: any) => ({
                id: p.id,
                source: 'pexels',
                type: 'image',
                url: p.src?.large2x || p.src?.original,
                thumbnail: p.src?.medium || p.src?.large,
                originalUrl: p.url,
                author: p.photographer,
                width: p.width,
                height: p.height
              }));
            }
          }
        } catch (e) { console.error("Merged: Pexels timeout/error", e); }
      })(),
      (async () => {
        try {
          const res = await fetchWithTimeout(`${baseUrl}/api/assets/pixabay?query=${encodeURIComponent(query)}&type=${type}`);
          if (res.ok) {
            const data = await res.json();
            pixabayNormalized = type === "video" ? (data.videos || []) : (data.images || []);
          }
        } catch (e) { console.error("Merged: Pixabay timeout/error", e); }
      })()
    ]);

    const maxLength = Math.max(pexelsNormalized.length, pixabayNormalized.length);
    const interleaved: any[] = [];

    for (let i = 0; i < maxLength; i++) {
        if (i < pexelsNormalized.length) interleaved.push(pexelsNormalized[i]);
        if (i < pixabayNormalized.length) interleaved.push(pixabayNormalized[i]);
    }

    const responseKey = type === "video" ? "videos" : "images";
    return NextResponse.json({
      query,
      [responseKey]: interleaved
    });
  } catch (error) {
    console.error("Critical Merged Assets Error:", error);
    return NextResponse.json({ query, [type === "video" ? "videos" : "images"]: [] });
  }
}
