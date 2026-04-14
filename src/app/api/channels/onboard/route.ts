import { researchChannelDNA } from "@/agent/onboarding";

export async function POST(req: Request) {
  try {
    const { name, vision, audience, competitors } = await req.json();
    
    if (!name || !vision) {
      return new Response(JSON.stringify({ error: "Name and Vision are required." }), { status: 400 });
    }

    const dna = await researchChannelDNA(name, vision, audience, competitors);
    
    return new Response(JSON.stringify(dna), { status: 200 });
  } catch (e) {
    console.error("Onboarding API Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Failed to research channel DNA" }), { status: 500 });
  }
}
