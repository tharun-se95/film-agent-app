import { getSupabaseAdminClient } from "@/utils/supabase";
import { strategicIntelAgent } from "@/agent/graph";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const { prompt } = await req.json();
    
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return new Response(JSON.stringify({ error: "Supabase client not initialized" }), { status: 500 });
    }

    // 1. Fetch Channel Niche
    const { data: channel, error: fetchError } = await supabase
      .from("channels")
      .select("niche")
      .eq("id", id)
      .single();

    if (fetchError || !channel) {
      return new Response(JSON.stringify({ error: "Channel not found" }), { status: 404 });
    }

    // 2. Invoke Strategic Intel Agent
    // We simulate a minimal state for the agent
    const initialState: any = {
      messages: [prompt || "Brainstorm new viral concepts"],
      nicheData: channel.niche || "General YouTube Niche",
      suggestions: []
    };

    const result = await strategicIntelAgent(initialState);
    
    // Persist to DB
    if (result.suggestions && result.suggestions.length > 0) {
      const suggestionsToInsert = result.suggestions.map(s => ({
        channel_id: id,
        title: s.title,
        reasoning: s.reasoning,
        hook: s.hook,
        status: 'SUGGESTED'
      }));

      const { data, error } = await supabase
        .from("channel_suggestions")
        .insert(suggestionsToInsert)
        .select();

      if (error) {
        console.error("Database Insert Error:", error);
      } else {
        return new Response(JSON.stringify(data), { status: 200 });
      }
    }

    return new Response(JSON.stringify(result.suggestions), { status: 200 });
  } catch (e) {
    console.error("CRITICAL: [Strategy API] Failure for ID:", id);
    console.error("Error Object:", e);
    return new Response(JSON.stringify({ 
      error: "Failed to generate strategy",
      details: e instanceof Error ? e.message : String(e)
    }), { status: 500 });
  }
}
