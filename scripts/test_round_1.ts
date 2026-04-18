import { compiledGraph } from '../src/agent/graph';
import { getSupabaseAdminClient } from '../src/utils/supabase';
import * as fs from 'fs';
import * as path from 'path';

async function runBrutalTest(topic: string) {
  console.log(`\n🚀 [BRUTAL TEST] Topic: "${topic}"`);
  console.log(`🔥 [ROUND 01] Metaphor Stress Test starting...`);

  const supabase = getSupabaseAdminClient();
  const projectId = crypto.randomUUID();

  if (supabase) {
    console.log(`📦 [DB] Creating ghost project: ${projectId}`);
    await supabase.from('projects').insert({
        id: projectId,
        name: `Brutal Test: ${topic.substring(0, 30)}...`,
        original_idea: topic,
        content_mode: 'YOUTUBE'
    });
  }

  const initialState = {
    messages: [topic],
    outline: '',
    draftInfo: '',
    drafts: [],
    hooks: [],
    nicheData: '',
    visualCues: '',
    criticScore: 0,
    criticNotes: '',
    iterations: 0,
    ytCriticIterations: 0,
    maxIterations: 2,
    contentMode: 'YOUTUBE',
    projectId: projectId,
    productionBundle: {
        scenes: [],
        brollSearchQueries: [],
        brollChecklist: []
    }
  };

  try {
    const result = (await compiledGraph.invoke(initialState)) as any;
    
    const logsDir = path.join(process.cwd(), 'logs', 'brutal_tests');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    const reportPath = path.join(logsDir, `report_${Date.now()}.json`);

    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    
    console.log(`✅ [ROUND 01] Complete.`);
    console.log(`📄 Audit result saved to: ${reportPath}`);
    
    // Quick Human-Readable Summary
    console.log(`\n=== BRUTAL FEEDBACK summary ===`);
    console.log(`Shadow Critic Score: ${result.criticScore}/10`);
    console.log(`Critic Notes: ${result.criticNotes}`);
    console.log(`\nVisual Metaphor Check (Scene 1):`);
    console.log(`Narration: ${result.productionBundle?.scenes[0]?.narration}`);
    console.log(`Visual Cue: ${result.productionBundle?.scenes[0]?.visualCue}`);
    console.log(`Queries: ${result.productionBundle?.scenes[0]?.searchQueries?.slice(0, 3).join(', ')}...`);

  } catch (error) {
    console.error(`❌ [BRUTAL TEST] Failed:`, error);
  }
}

const topic = process.argv[2] || "The psychological weight of a missed opportunity";
runBrutalTest(topic);
