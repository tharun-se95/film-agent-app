import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, model = 'flux', width = 1080, height = 1080 } = await req.json();

    const apiKey = process.env.POLLINATIONS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "POLLINATIONS_API_KEY is not set" }, { status: 500 });
    }

    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 999999);
    
    // Using the Pollinations Gen API
    const url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model}&width=${width}&height=${height}&seed=${seed}&nologo=true&key=${apiKey}`;

    console.log(`LOG: [Generative API] Generating image with model: ${model}`);
    
    // We return the URL and a local proxy metadata object
    // In a production app, we might download this to Supabase storage, 
    // but for now, we'll return the direct Pollinations URL which is persistent for that seed/prompt.
    
    const asset = {
      id: `gen_${seed}`,
      source: 'generative',
      type: 'image',
      url: url,
      thumbnail: url,
      originalUrl: url,
      author: `AI (${model})`,
      width,
      height
    };

    return NextResponse.json({
      prompt,
      asset
    });
  } catch (error) {
    console.error("Generative Asset Error:", error);
    return NextResponse.json({ error: "Failed to generate asset" }, { status: 500 });
  }
}
