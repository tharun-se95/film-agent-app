import { compiledGraph } from "../src/agent/graph";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import { getSupabaseAdminClient } from "../src/utils/supabase";

async function runNicheTest(topic: string) {
  const projectId = uuidv4();
  console.log(`🚀 [NICHE TEST] Topic: "${topic}"`);
  console.log(`📦 [DB] Creating discovery project: ${projectId}`);

  // FIX: Create the project in DB first to satisfy FK constraints
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { error } = await supabase.from('projects').insert({
      id: projectId,
      name: `Discovery: ${topic.slice(0, 20)}`,
      original_idea: topic,
      content_mode: 'YOUTUBE'
    });
    if (error) {
      console.error("❌ Failed to create project:", error.message);
      return;
    }
  }

  const initialState = {
    messages: [topic],
    projectId: projectId,
    contentMode: "YOUTUBE" as const,
    intent: "INTEL" as const, // Forced intent for discovery
    iterations: 0,
    nicheOpportunities: []
  };

  try {
    const result = await compiledGraph.invoke(initialState, {
       recursionLimit: 50,
       configurable: { thread_id: "test-niche-run" }
    });

    console.log("\n✅ [NICHE TEST] Discovery Flow Complete.");
    
    const reportPath = path.join(process.cwd(), "logs", "brutal_tests", `niche_report_${Date.now()}.json`);
    if (!fs.existsSync(path.dirname(reportPath))) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`📄 Niche report saved to: ${reportPath}`);

    console.log("\n=== DISCOVERED NICHES ===");
    result.nicheOpportunities.forEach((opp: any, i: number) => {
      console.log(`${i+1}. ${opp.name} [CPM: ${opp.cpm}] [Comp: ${opp.competition}]`);
      console.log(`   Angle: ${opp.reasoning.slice(0, 100)}...`);
    });

  } catch (error) {
    console.error("❌ [NICHE TEST] FAILED:", error);
  }
}

// Run with provided topic or default
const topic = process.argv[2] || "AI and Future Technology";
runNicheTest(topic);
