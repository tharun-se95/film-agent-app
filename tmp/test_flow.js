const crypto = require('crypto');

async function testFlow() {
  const projectId = crypto.randomUUID();
  console.log(`Starting Test with Project ID: ${projectId}`);

  try {
    const response = await fetch('http://127.0.0.1:3001/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: "A gothic horror about a lighthouse keeper who realizes the light is actually a beacon for something under the sea.",
        projectId: projectId
      })
    });

    if (!response.ok) {
      console.error(`Error: ${response.status} ${response.statusText}`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let stepsSeen = { outliner: false, drafter: false, critic: false };

    console.log("Waiting for stream...");

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.replace('data: ', '').trim();
          if (dataStr === '[DONE]') {
            console.log("\n--- STREAM FINISHED ---");
            break;
          }

          try {
            const data = JSON.parse(dataStr);
            console.log("LOG CHUNK:", Object.keys(data));
            
            if (data.outliner) {
              console.log("✅ OUTLINER DONE. Outline length:", data.outliner.outline.length);
              stepsSeen.outliner = true;
            }
            if (data.drafter) {
              console.log("✅ DRAFTER DONE.");
              stepsSeen.drafter = true;
            }
            if (data.critic) {
              console.log(`✅ CRITIC DONE. Score: ${data.critic.criticScore}`);
              stepsSeen.critic = true;
            }
          } catch (e) {
            // Ignore incomplete JSON chunks
          }
        }
      }
    }

    console.log("\n--- FINAL VERIFICATION ---");
    if (stepsSeen.outliner && stepsSeen.drafter && stepsSeen.critic) {
      console.log("🏆 FULL FLOW SUCCESSFUL: All agents cooperated.");
    } else {
      console.log("❌ FLOW INCOMPLETE:", stepsSeen);
    }

  } catch (error) {
    console.error("Test failed:", error);
  }
}

testFlow();
