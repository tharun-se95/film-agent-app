import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

async function run() {
  const API_KEY = process.env.GROQ_API_KEY;
  const BASE_URL = "https://api.groq.com/openai/v1";
  
  // Use the 70B variant for high-fidelity auditing
  const auditor = new ChatOpenAI({
    modelName: "llama-3.3-70b-versatile",
    temperature: 0.2,
    apiKey: API_KEY,
    configuration: { baseURL: BASE_URL }
  });

  const concepts = [
    {
      "title": "The Mysterious AI Lab: What Happens When You Ask a Question?",
      "reasoning": "This video leverages curiosity gaps to create an engaging narrative around AI-powered learning. The hook is the 3-second pause before the AI responds, creating an 'aha' moment.",
      "hook": "AI lab door closing, followed by an eerie silence before the AI responds"
    },
    {
      "title": "The Great Math Mystery: Can You Crack the Code?",
      "reasoning": "This video taps into the conflict between problem-solving and creative thinking, showcasing AI-powered learning as a tool for overcoming challenges.",
      "hook": "A cryptic message appears on screen, sparking curiosity"
    },
    {
      "title": "The Imagination Station: Where Art Meets AI",
      "reasoning": "This video showcases the intersection of creativity and technology, highlighting the channel's focus on making learning fun and accessible.",
      "hook": "A child's artwork comes to life, blending reality and fantasy"
    },
    {
      "title": "The AI vs. Human Challenge: Who Can Learn Faster?",
      "reasoning": "This video creates a lighthearted conflict between AI and human learning, emphasizing the channel's mission to make learning a delightful adventure.",
      "hook": "A timer starts counting down, building tension as the AI and human compete"
    },
    {
      "title": "The Secret World of AI: How It's Changing the Way We Learn",
      "reasoning": "This video explores the high-value entertainment aspect of AI-powered learning, using engaging visuals and storytelling to convey complex concepts.",
      "hook": "A child discovers a hidden world inside a computer, sparking wonder and curiosity"
    }
  ];

  console.log("🔥 [BRUTAL AUDIT] Initiating high-revenue review of Kids Intel...");

  const prompt = `You are a Hostile, High-Revenue YouTube Auditor who manages channels with 10M+ subscribers in the Kids/Education space.
  
  === AUDIT CRITERIA ===
  1. **CURIOSITY GAP**: Is the title clickable? (0-10)
  2. **RETENTION POTENTIAL**: Does the hook stop the scroll? (0-10)
  3. **INDUSTRIAL SCALE**: Can this niche sustain 100+ videos? (0-10)
  4. **CLICHÉ PURGE**: If it mentions "Mysterious lab" or "Secret world" without a specific angle, penalize it.
  
  === CONCEPTS TO AUDIT ===
  ${JSON.stringify(concepts, null, 2)}
  
  Provide a brutal, bulleted critique for each, and a final "Greenlight/Reject" status for the entire batch.`;

  const response = await auditor.invoke([
    new SystemMessage("You are an aggressive YouTube Strategist. You hate generic AI-generated templates. You demand high-energy, high-conflict concepts that force people to watch. Be extremely critical."),
    new HumanMessage(prompt)
  ]);

  console.log("\n--- AUDIT REPORT ---\n");
  console.log(response.content);
}

run();
