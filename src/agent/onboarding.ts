import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";

const API_KEY = process.env.GROQ_API_KEY;
const BASE_URL = "https://api.groq.com/openai/v1";
const MODEL_NAME = "llama-3.3-70b-versatile";

const onboardingLlm = new ChatOpenAI({
  modelName: MODEL_NAME,
  temperature: 0.7,
  apiKey: API_KEY,
  configuration: { baseURL: BASE_URL }
});

const OnboardingSchema = z.object({
  niche: z.string().describe("A deep, strategic description of the channel's niche and unique value proposition."),
  brand_voice: z.string().describe("A set of guidelines for the tone, style, and vocabulary of the channel content."),
  key_pillars: z.array(z.string()).describe("3-5 core content pillars or recurring themes for the channel."),
  target_audience_summary: z.string().describe("A brief summary of the ideal viewer's demographics and interests.")
});

const OpportunityBoardSchema = z.object({
  opportunities: z.array(z.object({
    name: z.string().describe("Cachable name for the niche."),
    vision: z.string().describe("The core vision statement for this niche."),
    monetization: z.string().describe("Brief estimation of profit potential, e.g. High CPM ($25+)."),
    landscape: z.string().describe("Why this niche is trending right now."),
    audience: z.string().describe("Ideal target audience description."),
    competitors: z.string().describe("Comma separated list of reference channels.")
  })).describe("A list of 4 unique, trending, high-potential YouTube niches.")
});

const SuggestionSchema = z.object({
  suggestion: z.string().describe("The suggested content for the specific field.")
});

type Opportunity = {
  name: string;
  vision: string;
  monetization: string;
  landscape: string;
  audience: string;
  competitors: string;
};

const DEFAULT_OPPORTUNITIES: Opportunity[] = [
  {
    name: "AI Automation Hacks",
    vision: "Deep dives into how AI agents and automation tools are transforming modern workflows.",
    monetization: "High CPM ($25+)",
    landscape: "Expanding interest in productivity and AI-driven efficiency.",
    audience: "Tech-savvy professionals and solo-preneurs.",
    competitors: "Matthew Berman, AI Explained"
  },
  {
    name: "Luxury Escapes Guide",
    vision: "Cinematic tours of the world's most exclusive and hidden travel destinations.",
    monetization: "Premium Ad Revenue",
    landscape: "High demand for escapist, high-quality visual content.",
    audience: "High-net-worth travelers and travel enthusiasts.",
    competitors: "The Luxury Travel Expert, Sam Chui"
  },
  {
    name: "The Stoic Mindset",
    vision: "Timeless philosophy applied to modern challenges, focused on clarity and resilience.",
    monetization: "High Retention / Sponsorships",
    landscape: "Growing wellness niche focused on mental strength.",
    audience: "Individuals seeking self-improvement and mental clarity.",
    competitors: "Daily Stoic, Pursuit of Wonder"
  },
  {
    name: "Financial Frontier",
    vision: "Explaining complex market trends and emerging asset classes with radical simplicity.",
    monetization: "Tier 1 Finance CPM",
    landscape: "Ongoing volatility driving demand for clear financial analysis.",
    audience: "Retail investors and financial enthusiasts.",
    competitors: "ColdFusion, Graham Stephan"
  }
];

export async function generateNicheOpportunities() {
  const systemPrompt = `You are a YouTube Market Analyst. 
Identify 4 highly lucrative, trending niches for a new automated content studio. 
Focus on niches with high CPM, growing demand, or technical 'voids' that AI can fill.

IMPORTANT: You MUST return ONLY a valid JSON object with the following structure:
{
  "opportunities": [
    {
      "name": "Niche Name",
      "vision": "Core vision statement",
      "monetization": "e.g. High CPM ($25+)",
      "landscape": "Trend context",
      "audience": "Target audience",
      "competitors": "Channel A, Channel B"
    }
  ]
}`;

  try {
    const res = await onboardingLlm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage("Generate 4 trending high-potential studio opportunities."),
    ], { 
      response_format: { type: "json_object" } 
    } as any);

    const content = res.content as string;
    const parsed = JSON.parse(content);
    console.log("LOG: [Onboarding] AI generated niches:", parsed.opportunities?.length);
    return parsed.opportunities && parsed.opportunities.length > 0 ? parsed.opportunities : DEFAULT_OPPORTUNITIES;
  } catch (e) {
    console.error("LOG: [Onboarding] Niche Generation Error:", e);
    return DEFAULT_OPPORTUNITIES;
  }
}

export async function suggestField(fieldName: string, context: { name: string, vision?: string, audience?: string }) {
  const systemPrompt = `You are a YouTube Strategist. 
Provide a high-impact suggestion for the field "${fieldName}" based on the current project context.
Be concise, strategic, and specific.

IMPORTANT: You MUST return ONLY a valid JSON object with the following structure:
{
  "suggestion": "Your brilliant suggestion here"
}`;

  const userPrompt = `Channel Name: ${context.name}
Current Vision: ${context.vision || "Not yet defined"}
Current Audience: ${context.audience || "Not yet defined"}

Suggest a brilliant value for the "${fieldName}" field.`;

  try {
    const res = await onboardingLlm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ], { 
      response_format: { type: "json_object" } 
    } as any);

    const content = res.content as string;
    const parsed = JSON.parse(content);
    return parsed.suggestion || `High-impact ${fieldName} for ${context.name}`;
  } catch (e) {
    console.error("LOG: [Onboarding] Agent Field Suggestion Failed:", e);
    return `Strategic ${fieldName} for ${context.name}`;
  }
}

export async function researchChannelDNA(name: string, vision: string, audience: string, competitors: string) {
  const systemPrompt = `You are a world-class YouTube Strategist and Brand Architect. 
Your task is to take basic channel information and expand it into a comprehensive 'Channel DNA'. 
This DNA will drive all future video concepts, scripts, and visual styles.

IMPORTANT: You MUST return ONLY a valid JSON object with the following structure:
{
  "niche": "Strategic description",
  "brand_voice": "Voice guidelines",
  "key_pillars": ["Pillar 1", "Pillar 2"],
  "target_audience_summary": "Audience details"
}`;

  const userPrompt = `Channel Name: ${name}
Core Vision/Topics: ${vision}
Target Audience: ${audience}
Reference/Competitor Channels: ${competitors}

Generate a deep strategic analysis for this channel.`;

  try {
    const res = await onboardingLlm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ], { 
      response_format: { type: "json_object" } 
    } as any);

    const content = res.content as string;
    return JSON.parse(content);
  } catch (e) {
    console.error("LOG: [Onboarding] DNA Synthesis Error:", e);
    return {
      niche: vision || "Strategic content generation",
      brand_voice: "Professional and authoritative",
      key_pillars: ["Industry Analysis", "Trend Spotting"],
      target_audience_summary: audience || "General audience interested in the niche"
    };
  }
}
