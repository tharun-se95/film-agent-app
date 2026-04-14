const { compiledGraph } = require('./src/agent/graph');
const crypto = require('crypto');
require('dotenv').config();

async function testGraph() {
  const projectId = crypto.randomUUID();
  console.log(`Testing Graph Logic for Project: ${projectId}`);

  const initialState = {
    messages: ["A space horror where the ship is alive."],
    projectId: projectId,
    iterations: 0
  };

  try {
    const stream = await compiledGraph.stream(initialState);
    for await (const chunk of stream) {
      console.log("CHUNK:", Object.keys(chunk));
      if (chunk.outliner) console.log("--- OUTLINER DONE ---");
      if (chunk.drafter) console.log("--- DRAFTER DONE ---");
      if (chunk.critic) console.log("--- CRITIC DONE ---");
    }
  } catch (e) {
    console.error("GRAPH CRASHED:", e);
  }
}

testGraph();
