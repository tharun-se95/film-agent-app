import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  modelName: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  configuration: {
    baseURL: "https://api.groq.com/openai/v1",
  }
});

async function runTest() {
  try {
    console.log("Sending test prompt to Groq...");
    const res = await llm.invoke("Are you receiving this? Please reply with 'Hello from Groq!'");
    console.log("Success! Response from Groq:");
    console.log(res.content);
  } catch (error) {
    console.error("Groq API Error:", error);
  }
}

runTest();
