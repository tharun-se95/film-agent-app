import { strategicIntelAgent } from "../src/agent/graph";
import { getSupabaseAdminClient } from "../src/utils/supabase";

async function run() {
  const channelId = "23b9cd8f-977f-4117-9155-9eb196931c65";
  const niche = "Transforming the way children learn through immersive, AI-powered educational experiences, making complex concepts accessible and fun for young minds";
  const brandVoice = "Inquisitive, imaginative, and inspiring, with a tone that's both educational and entertaining, making learning a delightful adventure for kids";

  console.log("🚀 [STRATEGIC INTEL] Starting brainstorm for Kids Education...");

  const state: any = {
    messages: ["Brainstorm 5 high-potential video concepts for this channel."],
    nicheData: `Niche: ${niche}\nVoice: ${brandVoice}`,
    projectId: "strategic-run"
  };

  try {
    const result = await strategicIntelAgent(state);
    const suggestions = result.suggestions || [];

    if (suggestions.length === 0) {
      console.error("❌ No suggestions generated.");
      return;
    }

    console.log(`✅ [STRATEGIC INTEL] Generated ${suggestions.length} suggestions.`);

    const supabase = getSupabaseAdminClient();
    if (supabase) {
      console.log("📦 [DB] Persisting suggestions to Supabase...");
      const insertData = suggestions.map((s: any) => ({
        channel_id: channelId,
        title: s.title,
        reasoning: s.reasoning,
        hook: s.hook,
        status: "SUGGESTED"
      }));

      const { error } = await supabase.from('channel_suggestions').insert(insertData);
      if (error) {
        console.error("❌ DB Error:", error.message);
      } else {
        console.log("🎉 Suggestions saved successfully.");
      }
    }

    console.log("\n=== SUGGESTIONS ===");
    console.log(JSON.stringify(suggestions, null, 2));

  } catch (err) {
    console.error("❌ Fatal Error:", err);
  }
}

run();
