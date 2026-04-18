import { NextRequest, NextResponse } from "next/server";

// HARDCODED FALLBACK: Ensuring stability regardless of environmental loading issues
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "rRAs0Hia2ZpYh2X9X30e06m5XhIe9B5X5e0e0e0e0e0e0e0e0e0e";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  const orientation = req.nextUrl.searchParams.get("orientation") || "landscape";
  const type = req.nextUrl.searchParams.get("type") || "video"; // 'video' or 'photo'
  
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    const endpoint = type === "video" 
      ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=15&orientation=${orientation}`
      : `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=${orientation}`;

    const response = await fetch(endpoint, {
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
