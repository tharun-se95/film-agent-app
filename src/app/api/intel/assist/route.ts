import { suggestField } from "@/agent/onboarding";

export async function POST(req: Request) {
  try {
    const { field, context } = await req.json();
    
    if (!field || !context.name) {
      return new Response(JSON.stringify({ error: "Field and Name are required." }), { status: 400 });
    }

    const suggestion = await suggestField(field, context);
    
    return new Response(JSON.stringify({ suggestion }), { status: 200 });
  } catch (e) {
    console.error("Assist API Error:", e);
    return new Response(JSON.stringify({ error: "Failed to fetch suggestion" }), { status: 500 });
  }
}
