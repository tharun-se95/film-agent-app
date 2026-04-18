import { strategicIntelAgent } from "../src/agent/graph";
import { getSupabaseAdminClient } from "../src/utils/supabase";

async function run() {
  const channelId = "23b9cd8f-977f-4117-9155-9eb196931c65";
  const niche = "Transforming the way children learn through immersive, AI-powered educational experiences, making complex concepts accessible and fun for young minds";
  const brandVoice = "Inquisitive, imaginative, and inspiring, with a tone that's both educational and entertaining, making learning a delightful adventure for kids";

  console.log("🔥 [INDUSTRIAL STRATEGIC INTEL] Starting 70B High-Conflict brainstorm...");

  const state: any = {
    messages: ["Brainstorm 5 HIGH-CONFLICT, VIRAL video concepts using the 70B Strategist. Avoid clichés."],
    nicheData: `Niche: ${niche}\nVoice: ${brandVoice}`,
    projectId: "high-conflict-run"
  };

  try {
    const result = await strategicIntelAgent(state);
    const suggestions = result.suggestions || [];

    if (suggestions.length === 0) {
      console.error("❌ No suggestions generated.");
      return;
    }

    console.log(`✅ [70B STRATEGY] Generated ${suggestions.length} High-Conflict concepts.`);

    const supabase = getSupabaseAdminClient();
    if (supabase) {
      console.log("🗑️ [DB] Clearing previous suggestions for this channel...");
      await supabase.from('channel_suggestions').delete().eq('channel_id', channelId);

      console.log("📦 [DB] Persisting new Industrial suggestions...");
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
        console.log("🎉 Industrial concepts saved successfully.");
      }
    }

    console.log("\n=== HIGH-CONFLICT CONCEPTS ===");
    console.log(JSON.stringify(suggestions, null, 2));

  } catch (err) {
    console.error("❌ Fatal Error:", err);
  }
}

run();
