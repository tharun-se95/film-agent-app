import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

async function run() {
  const API_KEY = process.env.GROQ_API_KEY;
  const BASE_URL = "https://api.groq.com/openai/v1";
  
  const auditor = new ChatOpenAI({
    modelName: "llama-3.3-70b-versatile",
    temperature: 0.2,
    apiKey: API_KEY,
    configuration: { baseURL: BASE_URL }
  });

  const concepts = [
    {
      "title": "I Spent 24 Hours in a Virtual Reality World and Almost Got Trapped Forever",
      "reasoning": "This concept combines the immersive aspect of AI-powered educational experiences with a high-stakes conflict, where the protagonist must navigate a virtual world and find a way out before time runs out.",
      "hook": "I'm stuck in a never-ending loop of code"
    },
    {
      "title": "The AI Robot That Outsmarted Me at Every Turn: Can I Beat It?",
      "reasoning": "This concept pits the protagonist against an AI-powered robot in a series of challenges, creating a sense of competition and conflict that will keep viewers engaged.",
      "hook": "The robot just checkmated me in 3 moves"
    },
    {
      "title": "The Giant Puzzle That Broke My Brain: Can You Solve It?",
      "reasoning": "This concept uses the 'Giant versions' framework to create a massive puzzle that the protagonist must solve, with a high level of difficulty and a sense of urgency.",
      "hook": "I've been stuck on this puzzle for 10 hours"
    },
    {
      "title": "The Mysterious Lab Where Experiments Went Horribly Wrong",
      "reasoning": "This concept uses the 'mysterious lab' framework, but with a twist: the experiments have gone wrong, and the protagonist must navigate the chaos and find a way to contain the damage.",
      "hook": "The lab is self-destructing in 60 seconds"
    },
    {
      "title": "I Tried to Learn a New Language in 30 Days Using Only AI Tools: Did I Succeed?",
      "reasoning": "This concept uses the 'I [Action] For [Time] And [Outcome]' framework to create a sense of challenge and conflict, as the protagonist attempts to learn a new language using only AI-powered tools.",
      "hook": "I just had a conversation with a native speaker and it was a disaster"
    }
  ];

  console.log("🔥 [FINAL INDUSTRIAL AUDIT] Reviewing 70B High-Conflict Concepts...");

  const prompt = `You are a Hostile, High-Revenue YouTube Auditor who manages channels with 10M+ subscribers in the Kids/Education space.
  
  === AUDIT CRITERIA ===
  1. **CURIOSITY GAP**: Is the title clickable? (0-10)
  2. **RETENTION POTENTIAL**: Does the hook stop the scroll? (0-10)
  3. **INDUSTRIAL SCALE**: Can this niche sustain 100+ videos? (0-10)
  4. **CLICHÉ PURGE**: These are regenerated concepts. Check if they have moved past "generic explainer" territory into "high-tension narrative".
  
  === CONCEPTS TO AUDIT ===
  ${JSON.stringify(concepts, null, 2)}
  
  Provide a brutal, bulleted critique for each, and a final "Greenlight/Reject" status for the entire batch.`;

  const response = await auditor.invoke([
    new SystemMessage("You are an aggressive YouTube Strategist. You hate generic AI-generated templates. You demand high-energy, high-conflict concepts that force people to watch. Be extremely critical."),
    new HumanMessage(prompt)
  ]);

  console.log("\n--- FINAL AUDIT REPORT ---\n");
  console.log(response.content);
}

run();
