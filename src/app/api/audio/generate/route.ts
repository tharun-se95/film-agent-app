import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/utils/supabase";

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId = "JBFqnCBsd6RMkjVDRZzb" } = await req.json(); // Defaulting to "George" (Gravelly American)

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ElevenLabs API Key in .env.local" }, { status: 500 });
    }

    console.log(`LOG: [Audio] Generating TTS for voice ${voiceId}`);

    // Call ElevenLabs TTS API
    const elResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!elResponse.ok) {
      const errorText = await elResponse.text();
      console.error("ElevenLabs Error:", errorText);
      throw new Error(`ElevenLabs API Error: ${elResponse.statusText}`);
    }

    const arrayBuffer = await elResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      throw new Error("Supabase Admin Client could not be initialized");
    }

    // Best-effort ensure the bucket exists (fails silently if it already does)
    await supabase.storage.createBucket('production_audio', { public: true }).catch(() => {});

    // Generate unique filename
    const filename = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    
    console.log(`LOG: [Audio] Uploading ${filename} to Supabase Storage`);

    const { error: uploadError } = await supabase.storage
      .from('production_audio')
      .upload(filename, buffer, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    if (uploadError) {
      console.error("Supabase Upload Error:", uploadError);
      throw uploadError;
    }

    // Get the public URL for the newly uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('production_audio')
      .getPublicUrl(filename);

    console.log(`LOG: [Audio] Generated successfully: ${publicUrl}`);

    return NextResponse.json({ audioUrl: publicUrl });

  } catch (error: any) {
    console.error("Audio Generation Route Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate audio" }, { status: 500 });
  }
}
