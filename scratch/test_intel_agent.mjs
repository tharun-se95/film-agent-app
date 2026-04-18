import { strategicIntelAgent } from "../../src/agent/graph.js"; // Adjust extension as needed for the test runner
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function testAgent() {
  console.log("Testing strategicIntelAgent...");
  const initialState = {
    messages: ["Brainstorm new viral concepts"],
    nicheData: "Tech reviews and tutorials",
    suggestions: []
  };

  try {
    const result = await strategicIntelAgent(initialState);
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Agent failed with error:", e);
  }
}

testAgent();
