import { NextRequest, NextResponse } from "next/server";
import { NormalizedVideoAsset } from "@/types/assets";

// HARDCODED FALLBACK: Ensuring the integration works even if .env.local has encoding issues
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || "55443750-c8243a541dbc844e7b3849140";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://pixabay.com/api/videos/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&per_page=5`);

    if (!response.ok) {
      return NextResponse.json({ error: "Pixabay API Error" }, { status: response.status });
    }

    const data = await response.json();
    
    // Normalize Pixabay -> NormalizedVideoAsset
    const normalized: NormalizedVideoAsset[] = (data.hits || []).map((hit: any) => {
      // HYBRID THUMBNAIL LOGIC: Prefer official, fallback to Vimeo CDN standard
      let thumb = hit.videos?.medium?.thumbnail || hit.videos?.large?.thumbnail || "";
      
      // If thumbnail is missing or is the 'tiny' version that often 404s, use the vimeocdn fallback
      if ((!thumb || thumb.includes("_tiny.jpg")) && hit.picture_id) {
        thumb = `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg`;
      }

      return {
        id: hit.id,
        source: 'pixabay',
        thumbnail: thumb,
        videoUrl: hit.videos?.medium?.url || hit.videos?.small?.url || "",
        originalUrl: hit.pageURL,
        author: hit.user,
        width: hit.videos?.medium?.width || 0,
        height: hit.videos?.medium?.height || 0,
        duration: hit.duration
      };
    });

    return NextResponse.json({
      query,
      videos: normalized
    });
  } catch (error) {
    console.error("Pixabay Proxy Error:", error);
    return NextResponse.json({ error: "Failed to fetch from Pixabay" }, { status: 500 });
  }
}
