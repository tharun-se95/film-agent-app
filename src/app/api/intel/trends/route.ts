import { generateNicheOpportunities } from "@/agent/onboarding";

export async function GET() {
  try {
    const opportunities = await generateNicheOpportunities();
    return new Response(JSON.stringify(opportunities), { status: 200 });
  } catch (e) {
    console.error("Trends API Error:", e);
    return new Response(JSON.stringify({ error: "Failed to fetch trends" }), { status: 500 });
  }
}
