import fs from 'fs';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error("❌ No ELEVENLABS_API_KEY found in .env.local");
  process.exit(1);
}

const voiceId = "JBFqnCBsd6RMkjVDRZzb"; // George
const text = "Testing the Gravity Studio audio core. Systems are operational.";

console.log("🎙️ Testing ElevenLabs API connectivity...");

try {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: text,
      model_id: "eleven_turbo_v2_5"
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ ElevenLabs API failed with status:", response.status);
    console.error("Error Details:", errorText);
  } else {
    console.log("✅ ElevenLabs API successful! Received status 200.");
    const buffer = await response.arrayBuffer();
    console.log(`✅ Received Audio Payload: ${buffer.byteLength} bytes.`);
    
    // Test writing to disk
    fs.writeFileSync("test-audio-output.mp3", Buffer.from(buffer));
    console.log("✅ Written to test-audio-output.mp3. Test complete!");
  }
} catch (error) {
  console.error("❌ Fetch Exception:", error);
}
