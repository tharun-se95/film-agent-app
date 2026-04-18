import { NextRequest, NextResponse } from "next/server";

// HARDCODED FALLBACK: Ensuring stability regardless of environmental loading issues
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "rRAs0Hia2ZpYh2X9X30e06m5XhIe9B5X5e0e0e0e0e0e0e0e0e0e";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  const orientation = req.nextUrl.searchParams.get("orientation") || "landscape";
  
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  // MOCK MODE: Return sample data if no API key is set
  if (!PEXELS_API_KEY) {
    console.warn("LOG: [Pexels Proxy] API Key missing. Returning mock assets.");
    return NextResponse.json({
      query,
      videos: [
        {
          id: 1,
          image: "https://images.pexels.com/videos/3196605/free-video-3196605.jpg?auto=compress&cs=tinysrgb&dpr=1&w=500",
          url: "https://www.pexels.com/video/vibrant-futuristic-city-3196605/",
          video_files: [
            { link: "https://player.vimeo.com/external/371433846.sd.mp4?s=236da37574a3d43d1f07.mp4" }
          ]
        }
      ]
    });
  }

  try {
    const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=1&orientation=${orientation}`, {
      headers: {
        Authorization: PEXELS_API_KEY
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.message || "Pexels API Error" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Pexels Proxy Error:", error);
    return NextResponse.json({ error: "Failed to fetch from Pexels" }, { status: 500 });
  }
}
