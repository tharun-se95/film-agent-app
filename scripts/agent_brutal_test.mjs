import { compiledGraph } from '../src/agent/graph.ts';
import fs from 'fs';
import path from 'path';

async function runBrutalTest(topic) {
  console.log(`\n🚀 [BRUTAL TEST] Topic: "${topic}"`);
  console.log(`🔥 [ROUND 01] Metaphor Stress Test starting...`);

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
    maxIterations: 1,
    projectId: `test_brutal_${Date.now()}`,
    productionBundle: {
        scenes: [],
        brollSearchQueries: [],
        brollChecklist: []
    }
  };

  try {
    const result = await compiledGraph.invoke(initialState);
    
    const reportPath = path.join(process.cwd(), 'logs', 'brutal_tests', `report_${Date.now()}.json`);
    if (!fs.existsSync(path.dirname(reportPath))) {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    
    console.log(`✅ [ROUND 01] Complete.`);
    console.log(`📄 Audit result saved to: ${reportPath}`);
    
    // Quick Human-Readable Summary
    console.log(`\n=== BRUTAL FEEDBACK summary ===`);
    console.log(`Shadow Critic Score: ${result.criticScore}/10`);
    console.log(`Critic Notes: ${result.criticNotes}`);
    console.log(`\nVisual Metaphor Check (Scene 1):`);
    console.log(`Narration: ${result.productionBundle.scenes[0]?.narration}`);
    console.log(`Visual Cue: ${result.productionBundle.scenes[0]?.visualCue}`);
    console.log(`Queries: ${result.productionBundle.scenes[0]?.searchQueries.slice(0, 3).join(', ')}...`);

  } catch (error) {
    console.error(`❌ [BRUTAL TEST] Failed:`, error);
  }
}

const topic = process.argv[2] || "The psychological weight of a missed opportunity";
runBrutalTest(topic);
