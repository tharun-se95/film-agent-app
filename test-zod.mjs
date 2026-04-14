import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const llm = new ChatOpenAI({
  modelName: "llama-3.3-70b-versatile",
  temperature: 0,
  apiKey: process.env.GROQ_API_KEY,
  configuration: {
    baseURL: "https://api.groq.com/openai/v1",
  }
});

const schema = z.object({
  score: z.number(),
  feedback: z.string()
});

async function run() {
  try {
    const analyzer = llm.withStructuredOutput(schema, { name: "review", method: "functionCalling" });
    const res = await analyzer.invoke("Evaluate this: Hello world");
    console.log("Success:", res);
  } catch(e) {
    console.error("Zod Error:", e);
  }
}
run();
