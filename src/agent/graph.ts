import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { getSupabaseClient, getSupabaseAdminClient } from "../utils/supabase";
import { logAgentExecution } from "../utils/logger";

// ==========================================
// 1. Configure the Multi-LLM Setup
// ==========================================

const API_KEY = process.env.GROQ_API_KEY;
const BASE_URL = "https://api.groq.com/openai/v1";
const MODEL_NAME = "llama-3.1-8b-instant"; // GHOST BRAIN MODE: Temporarily using 8b with advanced prompting

// 1. SURGEON (8B - Simulating 70B): Forced pedantry for narrative logic
const surgeonLlm = new ChatOpenAI({
  modelName: MODEL_NAME,
  temperature: 0.8, // Slightly higher to force creative leaps in smaller model
  apiKey: API_KEY,
  configuration: { baseURL: BASE_URL },
  timeout: 30000 
});

// 2. EVALUATOR (70B): Zero-temp for deterministic grading
const evaluatorLlm = new ChatOpenAI({
  modelName: MODEL_NAME,
  temperature: 0.0,
  apiKey: API_KEY,
  configuration: { baseURL: BASE_URL },
  timeout: 20000
});

// 3. NURSE (8B): High-speed, high-volume for technical checklists and queries
const nurseLlm = new ChatOpenAI({
  modelName: "llama-3.1-8b-instant",
  temperature: 0.5,
  apiKey: API_KEY,
  configuration: { baseURL: BASE_URL }
});

// 4. THE BOSS (70B): High-Fidelity Strategic Brain for Viral Architecting
const bossLlm = new ChatOpenAI({
  modelName: "llama-3.3-70b-versatile",
  temperature: 0.7,
  apiKey: API_KEY,
  configuration: { baseURL: BASE_URL },
  timeout: 45000
});

// Zod Schema for Strategic Suggestions
const StrategicSchema = z.object({
  suggestions: z.array(z.object({
    title: z.string().describe("The viral video title."),
    reasoning: z.string().describe("Why this fits the current niche gap."),
    hook: z.string().describe("The suggested pattern interrupt for the first 3 seconds.")
  })).describe("A list of 5 high-potential video concepts.")
});

// Zod Schema for Niche Opportunities (Hardened for 8B hallucinations)
const NicheOpportunitySchema = z.object({
  name: z.string().describe("The specific micro-niche name."),
  cpm: z.string().describe("Estimated CPM range."),
  competition: z.enum(["LOW", "MEDIUM", "HIGH"]).describe("Level of creator saturation."),
  hook: z.string().describe("A 3-second pattern interrupt concept."),
  reasoning: z.string().describe("Why this niche is a gap.")
}).passthrough(); // Allow extra model-specific keys

const NicheClusterSchema = z.object({
  niches: z.array(NicheOpportunitySchema).optional(),
  opportunities: z.array(NicheOpportunitySchema).optional(),
  niche_opportunities: z.array(NicheOpportunitySchema).optional(),
}).describe("A list of 5-10 high-value niche opportunities.");

// Zod Schema for the Critic's Structured JSON Output
const CriticSchema = z.object({
  score: z.number().min(1).max(10).describe("The script's score out of 10. Be very strict."),
  feedback: z.string().describe("Constructive, detailed notes on pacing, dialogue, character, and action. Provide very specific instructions for the rewrite.")
});

// ==========================================
// 2. Define the Global State Memory
// ==========================================

export const AgentState = Annotation.Root({
  // Global message log
  messages: Annotation<string[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  // Current outline 
  outline: Annotation<string>({
    reducer: (current, update) => update,
    default: () => "",
  }),
  // History of generated drafts (appending the newly generated draft)
  drafts: Annotation<string[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  // History of critique notes
  historicalFeedback: Annotation<string[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  // Extracted values for immediate UI rendering logic
  draftInfo: Annotation<string>({
    reducer: (current, update) => update,
    default: () => "",
  }),
  criticScore: Annotation<number>({
    reducer: (current, update) => update,
    default: () => 0,
  }),
  criticNotes: Annotation<string>({
    reducer: (current, update) => update,
    default: () => "",
  }),
  iterations: Annotation<number>({
    reducer: (current, update) => current + update,
    default: () => 0,
  }),
  // Project tracking
  projectId: Annotation<string>({
    reducer: (current, update) => update,
    default: () => "",
  }),
  // YouTube Strategist Fields
  contentMode: Annotation<"FILM" | "YOUTUBE">({
    reducer: (current, update) => update,
    default: () => "FILM",
  }),
  nicheData: Annotation<string>({
    reducer: (current, update) => update,
    default: () => "",
  }),
  hooks: Annotation<string[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  visualCues: Annotation<string>({
    reducer: (current, update) => update,
    default: () => "",
  }),
  ytMetadata: Annotation<{ title: string; description: string; tags: string[] }>({
    reducer: (current, update) => update,
    default: () => ({ title: "", description: "", tags: [] }),
  }),
  retentionScore: Annotation<number>({
    reducer: (current, update) => update,
    default: () => 0,
  }),
  retentionNotes: Annotation<string>({
    reducer: (current, update) => update,
    default: () => "",
  }),
  productionBundle: Annotation<{
    thumbnailConcepts: { title: string; prompt: string }[];
    brollChecklist: string[];
    brollSearchQueries?: string[];
    sfxChecklist?: string[];
    vfxRequirements?: string[];
    musicInspiration?: string;
    scenes?: {
      title: string;
      narration: string;
      visualCue: string;
      searchQueries: string[];
    }[];
    voiceGuidance: string;
    cleanNarratorScript?: string;
  }>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({
      thumbnailConcepts: [],
      brollChecklist: [],
      sfxChecklist: [],
      vfxRequirements: [],
      musicInspiration: "",
      voiceGuidance: "",
      cleanNarratorScript: ""
    }),
  }),
  ytCriticIterations: Annotation<number>({
    reducer: (current, update) => current + update,
    default: () => 0,
  }),
  // Conversational Intent (Autonomous Routing)
  intent: Annotation<"FULL" | "INTEL" | "DRAFT" | "CRITIC" | "VISUALS" | "NONE">({
    reducer: (current, update) => update,
    default: () => "NONE",
  }),
  // Strategic Suggestions (Industrial Mode)
  suggestions: Annotation<{ title: string; reasoning: string; hook: string }[]>({
    reducer: (current, update) => update,
    default: () => [],
  }),
  // Niche Architecture (Discovery Mode)
  nicheOpportunities: Annotation<{
    name: string;
    cpm: string;
    competition: "LOW" | "MEDIUM" | "HIGH";
    hook: string;
    reasoning: string;
  }[]>({
    reducer: (current, update) => update,
    default: () => [],
  }),
});

// ==========================================
// 3. Define the Nodes (The AI Agents)
// ==========================================

async function outlinerAgent(state: typeof AgentState.State) {
  try {
    console.log("HEARTBEAT: [Outliner] Entry");
    console.log("LOG: [Outliner] Starting...");
    const latestMessage = state.messages[state.messages.length - 1];

    // REFINEMENT MODE: If we have an existing outline, we evolve it
    if (state.iterations > 0 && state.outline) {
      console.log("Outliner: Refining existing plot beats...");
      const response = await surgeonLlm.invoke([
        new SystemMessage("You are an expert Hollywood Script Doctor. You are refining an existing BEAT SHEET based on new user instructions. Keep the core narrative structure where possible, but integrate the new changes seamslessly. Be concise and punchy."),
        new HumanMessage(`EXISTING BEAT SHEET:\n${state.outline}\n\nNEW INSTRUCTIONS:\n${latestMessage}`)
      ]);

      return {
        messages: ["Outliner: Successfully refined the plot beats."],
        outline: response.content as string,
      };
    }

    // INITIAL PLOT MODE
    console.log("Outliner: Plotting initial script structure...");
    const response = await surgeonLlm.invoke([
      new SystemMessage("You are an expert Hollywood Outliner. Write a detailed, rich 3-act beat sheet based on the user's idea. Provide deep character motivations and cinematic pacing. Focus on the core emotional arc."),
      new HumanMessage(latestMessage)
    ]);

    console.log("LOG: [Outliner] Finished plotting.");
    return {
      messages: ["Outliner: Finished plotting the scene."],
      outline: response.content as string,
    };
  } catch (e) {
    console.error("Outliner Error:", e);
    return {
      messages: [`System Error (Outliner): ${e instanceof Error ? e.message : "Failed to generate outline"}`]
    };
  }
}

async function drafterAgent(state: typeof AgentState.State) {
  try {
    console.log("HEARTBEAT: [Drafter] Entry");
    const stepMsg = state.iterations === 0 ? "Drafting: Constructing the narrative architecture..." : "Refining: Performing surgical script edits...";
    console.log(`LOG: [Drafter] ${stepMsg}`);

    // LOGIC FIX: Find the actual user instruction by filtering out agent-prefixed logs
    const instructionLogs = state.messages.filter(m =>
      !m.startsWith("Outliner:") &&
      !m.startsWith("Drafter:") &&
      !m.startsWith("Critic:") &&
      !m.startsWith("System:")
    );
    const latestUserMessage = instructionLogs[instructionLogs.length - 1] || state.messages[0];

    let finalPrompt = `Write a comprehensive screenplay scene based on this plot outline:\n\n${state.outline}\n\nInitial Ideas: ${latestUserMessage}\n\nFocus on vivid scene descriptions and nuanced dialogue. Keep the scene tight and cinematic.`;

    let sysPrompt = `You are an AI simulating a 70B parameter Screenwriter. 
    Your goal is SUBTEXT. Do not be literal. 
    If a character is sad, do not have them cry; have them clean a mirror until it streaks.
    Write visually stunning, emotionally rich scenes. 
    Do not use asterisks or markdown bolding, just pure text caps for names.`;

    if (state.iterations > 0 && state.draftInfo) {
      console.log("LOG: [Drafter] Transitioning to Refinement Mode...");
      finalPrompt = `You are a Script Doctor. You are editing an EXISTING screenplay scene.\n\nOutline: ${state.outline}\n\n--- EXISTING DRAFT ---\n${state.draftInfo}\n\n--- USER REFINEMENT QUERY ---\n${latestUserMessage}\n\n--- LATEST CRITIC NOTES ---\n${state.criticNotes}\n\nINSTRUCTION: ONLY change the specific parts of the script mentioned in the Refinement Query or Critic Notes. Keep the rest of the dialogue and prose EXACTLY as it is. Return the FULL updated script.`;
      sysPrompt = "You are an expert Script Doctor. Perform surgical precision edits. Preserve the existing script's voice and only modify what is necessary to fulfill the request.";
    }

    const response = await surgeonLlm.invoke([
      new SystemMessage(sysPrompt),
      new HumanMessage(finalPrompt)
    ]);

    console.log("LOG: [Drafter] LLM finished generation.");
    const rawContent = response.content as string;

    // Persist to Supabase if configured
    const supabase = getSupabaseAdminClient();
    const nextIteration = state.iterations + 1;

    if (supabase) {
      console.log(`LOG: [Drafter] Saving to Supabase iteration ${nextIteration}...`);
      const { error } = await supabase.from('drafts').insert([
        {
          project_id: state.projectId,
          content: rawContent,
          iteration: nextIteration,
          prompt_context: state.outline
        }
      ]);

      if (error) {
        console.error("Supabase storage error [Drafter]:", error.message);
        throw new Error(`Persistence Error: ${error.message}`);
      }
    }

    return {
      messages: ["Drafter: Script written. Passing to compliance for review."],
      draftInfo: rawContent,
      drafts: [rawContent],
      iterations: 1, // Reducer increments global state by 1
    };
  } catch (e) {
    console.error("Drafter Error:", e);
    return {
      messages: [`System Error (Drafter): ${e instanceof Error ? e.message : "Failed to draft script"}`]
    };
  }
}

async function criticAgent(state: typeof AgentState.State) {
  try {
    console.log("HEARTBEAT: [Critic] Entry");
    console.log("LOG: [Critic] Starting AGGRESSIVE evaluation...");

    const evaluator = evaluatorLlm.withStructuredOutput(CriticSchema, { name: "evaluate_script", method: "jsonMode" });

    const prompt = `You are a Hostile, Brutal, and High-Expectation Hollywood Executive. 
    You are evaluating a YouTube script that needs to capture millions of views.
    
    === CRITICAL EVALUATION RULES ===
    1. **KILL THE CLICHÉ**: If the script uses patterns like "In a world where...", "Have you ever wondered...", or generic motivational tropes, TRASH IT.
    2. **CONFLICT OR DEATH**: Every high-revenue script MUST have a clearly defined conflict (Man vs Self, Man vs Nature, or a specific antagonist). If it feels like a Wikipedia entry, give it a score of 3 and demand a rewrite.
    3. **RETENTION AUDIT**: Look for "boring" sections where the pacing sags. Demand "Pattern Interrupts".
    
    Draft to Audit:\n${state.draftInfo}`;

    const result = await evaluator.invoke([
      new SystemMessage("You are an aggressive Studio Head. You return ONLY valid JSON and you NEVER give a score higher than 7 unless the script is truly revolutionary."),
      new HumanMessage(prompt)
    ]);

    const supabase = getSupabaseAdminClient();
    if (supabase) {
      await supabase.from('drafts')
        .update({ critic_score: result.score, critic_notes: result.feedback })
        .eq('project_id', state.projectId)
        .eq('iteration', state.iterations);
    }

    return {
      messages: [`Shadow Critic: [Audit Result: ${result.score}/10] Recommendation: ${result.score < 6 ? 'REJECTED' : 'CONDITIONALLY ACCEPTED'}`],
      criticScore: result.score,
      criticNotes: result.feedback,
      historicalFeedback: [result.feedback]
    };
  } catch (e) {
    console.error("Critic Error:", e);
    return {
      messages: [`Shadow Critic: Error in auditing cycle. Defaulting to safe score.`],
      criticScore: 5
    };
  }
}

// ==========================================
// 3b. New YouTube Strategist Nodes
// ==========================================

async function nicheArchitectAgent(state: typeof AgentState.State) {
  try {
    console.log("HEARTBEAT: [Niche Architect] Entry");
    console.log("LOG: [Niche Architect] Brainstorming viral sub-niches...");
    const latestMessage = state.messages[state.messages.length - 1] || "general interest";

    const analyzer = nurseLlm.withStructuredOutput(NicheClusterSchema, { name: "generate_niches", method: "jsonMode" });
    
    const systemPrompt = `You are a World-Class YouTube Niche Architect. 
    Your goal is to identify 5-7 HIGH-VALUE, HIGH-CPM micro-niches based on the user's core interest.
    Use the 'Combinatorial Method': Combine the core topic with a high-intent domain (e.g. Wellness + SaaS, Engineering + Finance).
    
    Categorize opportunities by:
    1. THE GOLD MINE: Highest CPM potential ($30+).
    2. THE TRENDING WAVE: High search velocity, rising interest.
    3. THE BLUE OCEAN: Low competition, unique gap.
    
    === JSON FORMAT (STRICT) ===
    You MUST return a JSON object with a key 'niches'. Each niche object must have exactly these keys: 'name', 'cpm', 'competition', 'hook', 'reasoning'.
    
    EXAMPLE:
    {
      "niches": [
        {
          "name": "Bio-Hacking for Elite Athletes",
          "cpm": "$50-$70",
          "competition": "LOW",
          "hook": "A professional athlete collapses on field...",
          "reasoning": "High-net-worth audience, specific bio-metric data focus."
        }
      ]
    }`;

    const result = await analyzer.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Core Topic/Interest: ${latestMessage}`)
    ]);

    // NORMALIZATION LAYER: Map whatever the model returned to our standard keys
    const rawNiches = result.niches || result.opportunities || result.niche_opportunities || [];
    const normalizedNiches = rawNiches.map((n: any) => ({
      name: n.name || n.niche || n['Micro-Niche'] || "Unknown Opportunity",
      cpm: n.cpm || n.cpmPotential || n['CPM Potential'] || "$0-$0",
      competition: n.competition || "MEDIUM",
      hook: n.hook || n.viralHook || "Coming soon...",
      reasoning: n.reasoning || "Discovery phase."
    }));

    // Save to Supabase (Niche Cluster)
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      await supabase.from('projects')
        .update({ niche_opportunities: normalizedNiches })
        .eq('id', state.projectId);
    }

    return {
      messages: ["Niche Architect: Discovery complete. I've identified a rich list of high-value opportunities."],
      nicheOpportunities: normalizedNiches
    };
  } catch (e) {
    console.error("Niche Architect Error:", e);
    return { messages: [`System Error (Niche Architect): ${e instanceof Error ? e.message : "Failed"}`] };
  }
}

async function intelAgent(state: typeof AgentState.State) {
  try {
    console.log("HEARTBEAT: [Intel] Entry");
    
    // If we have niche opportunities, we focus on the first/best one
    const targetNiche = state.nicheOpportunities.length > 0 
      ? state.nicheOpportunities[0].name 
      : state.messages[state.messages.length - 1];

    console.log(`LOG: [Intel] Deep-diving into niche: ${targetNiche}`);

    // Switch to utilityLlm (8b) to save premium tokens and bypass 70b rate limits
    const response = await nurseLlm.invoke([
      new SystemMessage("You are a YouTube Market Intelligence Agent. Analyze the niche, CPM potential, and competitor metrics. Identify a 'Viral Angle' for the provided topic."),
      new HumanMessage(`Topic: ${targetNiche}\n\nProvide Niche Intel, estimated CPM, and competitor gaps.`)
    ]);

    // Persist niche data to Supabase (Initial insert for this iteration)
    const supabase = getSupabaseAdminClient();
    const nextIteration = state.iterations + 1;

    if (supabase) {
      const { error } = await supabase.from('drafts').upsert({
        project_id: state.projectId,
        niche_data: response.content as string,
        iteration: nextIteration,
        prompt_context: targetNiche
      }, { onConflict: 'project_id, iteration' });

      if (error) {
        console.error("Supabase intel storage error:", error.message);
        throw new Error(`Intel Persistence Error: ${error.message}`);
      }
    }

    // AUDIT: Log raw AI response
    logAgentExecution(state.projectId, `[INTEL RESPONSE]\n${response.content}`);

    return {
      messages: ["Intel: [Progress: 1/6] Deep-dive market analysis complete."],
      nicheData: response.content as string,
      iterations: 1,
    };
  } catch (e) {
    console.error("Intel Error:", e);
    return { messages: [`System Error (Intel): ${e instanceof Error ? e.message : "Failed"}`] };
  }
}

async function hookScientistAgent(state: typeof AgentState.State) {
  try {
    console.log("HEARTBEAT: [Hook Scientist] Entry");
    const stepMsg = state.iterations === 0 ? "Hooking: Reverse-engineering viral patterns..." : "Refining: Polishing the hook for maximum retention...";
    console.log(`LOG: [Hook Scientist] ${stepMsg}`);
    let sysPrompt = "You are a YouTube Scriptwriting Expert. Write a COMPLETE, COMPREHENSIVE, AND CINEMATIC script. Your goal is a 10-minute video duration (approx 1500 words). DO NOT just focus on the intro; write the entire narrative arc. CRITICAL: The first 3 seconds MUST have a psychological pattern interrupt.";
    let humPrompt = `Niche Data: ${state.nicheData}\n\nWrite the FULL, COMPLETE script for this video. Include all sections, transitions, and the final call-to-action. Ensure the content is deep and engaging throughout.`;

    if (state.iterations > 0 && state.draftInfo) {
      console.log("LOG: [Hook Scientist] Transitioning to Refinement Mode...");
      sysPrompt = "You are an expert YouTube Script Doctor. You are refining an existing script based on user feedback. Perform surgical, targeted edits only.";
      humPrompt = `--- EXISTING SCRIPT ---\n${state.draftInfo}\n\n--- REFINEMENT REQUEST ---\n${state.messages[state.messages.length - 1]}\n\nINSTRUCTION: ONLY change the specific sections mentioned in the request. If the user asks for a better hook, keep the rest of the body exactly the same. Return the FULL updated script.`;
    }

    const response = await surgeonLlm.invoke([
      new SystemMessage(sysPrompt),
      new HumanMessage(humPrompt)
    ]);

    // AUDIT: Log raw AI response
    logAgentExecution(state.projectId, `[HOOK SCIENTIST RESPONSE]\n${response.content}`);

    // Update draft with content
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      const { error } = await supabase.from('drafts')
        .update({ content: response.content as string })
        .eq('project_id', state.projectId)
        .eq('iteration', state.iterations);

      if (error) {
        console.error("Supabase hook storage error:", error.message);
        throw new Error(`Hook Persistence Error: ${error.message}`);
      }
    }

    return {
      messages: ["Hooks: [Progress: 2/6] Logic-cloned and engineered script."],
      draftInfo: response.content as string,
    };
  } catch (e) {
    console.error("Hook Scientist Error:", e);
    return { messages: [`System Error (Hook Scientist): ${e instanceof Error ? e.message : "Failed"}`] };
  }
}

async function visualistAgent(state: typeof AgentState.State) {
  try {
    console.log("HEARTBEAT: [Visualist] Entry");
    console.log("LOG: [Visualist] Mapping B-roll with Concept Logic...");
    
    const FORBIDDEN_LIST = "Technology, AI, Innovation, Future, Digital, Success, Growth, Data, Medicine, Health, Science";
    
    // SURGEON LAYER: High-intelligence concept mapping
    const conceptMapper = await surgeonLlm.invoke([
      new SystemMessage(`You are a Professional Cinematographer and Visual Concept Designer.
      
      === THE FORBIDDEN LIST ===
      NEVER search for the following generic keywords: ${FORBIDDEN_LIST}. 
      If the topic is "Innovation", search for "Steam escaping a brass machine" or "Macro shot of a seed sprouting". 
      
      === CONCEPT MAPPING RULES ===
      1. Map keywords to TEXTURES and MOODS. 
      2. If the text is SAD, search for "Rain on a window", "Shadows on a brick wall". 
      3. If the text is ENERGETIC, search for "Fast shutter speed water splash", "City lights moving".`),
      new HumanMessage(`Script:\n${state.draftInfo}`)
    ]);

    const supabase = getSupabaseAdminClient();
    if (supabase) {
      await supabase.from('drafts')
        .update({ visual_cues: conceptMapper.content as string })
        .eq('project_id', state.projectId)
        .eq('iteration', state.iterations);
    }

    logAgentExecution(state.projectId, `[VISUALIST CONCEPTS]\n${conceptMapper.content}`);

    const STORYBOARD_SCHEMA = z.object({
      scenes: z.array(z.object({
        title: z.string().describe("Scene title."),
        narration: z.string().describe("Verbatim narrator spoken text."),
        visualCue: z.string().describe("Concise mood description."),
        searchQueries: z.array(z.string()).min(2).max(15).describe("Highly specific Pexels-ready queries.")
      })),
      allSearchQueries: z.array(z.string())
    });
    
    // NURSE LAYER: High-volume query generation using 8b
    const queryGen = nurseLlm.withStructuredOutput(STORYBOARD_SCHEMA, { name: "generate_storyboard", method: "jsonMode" });
    const storyboardResult = await queryGen.invoke([
      new SystemMessage(`You are a Search Specialist. 
      FORBIDDEN WORDS: ${FORBIDDEN_LIST}. 
      Use highly descriptive textures (e.g., 'rusty metal', 'macro eye iris', 'cracked soil').
      Every query MUST be English and MUST describe a SPECIFIC cinematic shot.
      Return the results in JSON format.`),
      new HumanMessage(`=== SOURCE SCRIPT ===\n${state.draftInfo}\n=== ANNOTATED CUES ===\n${conceptMapper.content}\n\nSTRICT INSTRUCTION: Return the above analysis in valid JSON format.`)
    ]);

    const updatedBundle = { 
      ...state.productionBundle, 
      scenes: storyboardResult.scenes,
      brollSearchQueries: storyboardResult.allSearchQueries,
      brollChecklist: storyboardResult.scenes.map(s => s.visualCue)
    };

    if (supabase) {
      await supabase.from('drafts')
        .update({ production_bundle: updatedBundle })
        .eq('project_id', state.projectId)
        .eq('iteration', state.iterations);
    }

    return {
      messages: ["Visualist: Hybrid logic applied. Surgeon mapped the textures, Nurse generated the queries."],
      visualCues: conceptMapper.content as string,
      productionBundle: updatedBundle
    };
  } catch (e) {
    console.error("Visualist Error:", e);
    return { messages: [`Visualist Failed: ${e instanceof Error ? e.message : "Internal Error"}`] };
  }
}

async function complianceAgent(state: typeof AgentState.State) {
  try {
    console.log("HEARTBEAT: [Compliance] Entry");
    console.log("LOG: [Compliance] Generating SEO & Metadata...");
    const SEO_SCHEMA = z.object({
      title: z.string().default("UNTITLED MASTERPIECE"),
      description: z.string().optional(),
      tags: z.array(z.string()).default([])
    });

    // Use evaluatorLlm (8b in ghost mode) with jsonMode for structured SEO
    const analyzer = evaluatorLlm.withStructuredOutput(SEO_SCHEMA, { name: "generate_seo", method: "jsonMode" });
    const result = await analyzer.invoke([
      new SystemMessage("You are a YouTube SEO Expert. Generate a viral title, descriptive meta description, and 10 high-performance tags for the following video script in JSON format."),
      new HumanMessage(`VIDEO CONTENT:\n${state.draftInfo}\nVISUAL STYLE:\n${state.visualCues}\n\nReturn ONLY a JSON object.`)
    ]);

    // Update draft with SEO metadata
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      const { error } = await supabase.from('drafts')
        .update({ yt_metadata: result })
        .eq('project_id', state.projectId)
        .eq('iteration', state.iterations);

      if (error) {
        console.error("Supabase compliance storage error:", error.message);
        throw new Error(`Metadata Persistence Error: ${error.message}`);
      }
    }

    // AUDIT: Log raw AI response
    logAgentExecution(state.projectId, `[COMPLIANCE RESPONSE]\n${JSON.stringify(result, null, 2)}`);

    return {
      messages: ["Compliance: [Progress: 5/6] Optimized SEO metadata for discovery."],
      ytMetadata: result,
    };
  } catch (e) {
    console.error("Compliance Error:", e);
    return { messages: [`System Error (Compliance): ${e instanceof Error ? e.message : "Failed"}`] };
  }
}

async function retentionCriticAgent(state: typeof AgentState.State) {
  try {
    console.log("HEARTBEAT: [Retention Critic] Entry");
    console.log("LOG: [Retention Critic] Auditing for Viral Retention...");

    const analyzer = evaluatorLlm.withStructuredOutput(CriticSchema, { name: "evaluate_retention", method: "jsonMode" });

    const prompt = `You are a World-Class YouTube Retention Strategist who manages channels with 10M+ subscribers.
    
    === BRUTAL RETENTION RULES ===
    1. **THE 3-SECOND RULE**: If the opening doesn't have a massive pattern interrupt, FAIL IT.
    2. **STORYTELLING TENSION**: YouTube is about tension. If this script feels like a lecture or a summary, give it a score of 4.
    3. **CLICHÉ PURGE**: Any use of "Have you ever wondered...", "Welcome back to the channel", or "Let's dive in" must be flagged as a critical error.
    
    Current Draft:\n${state.draftInfo}`;

    const result = await analyzer.invoke([
      new SystemMessage(`You are a Hostile Retention Guru. You NEVER give a passing score (8+) to generic content.
      
      IMPORTANT: You MUST return a VALID JSON object with:
      {
        "score": number (1-10),
        "feedback": "string"
      }`),
      new HumanMessage(prompt)
    ]);

    const supabase = getSupabaseAdminClient();
    if (supabase) {
      await supabase.from('drafts')
        .update({ critic_score: result.score, critic_notes: result.feedback })
        .eq('project_id', state.projectId)
        .eq('iteration', state.iterations);
    }

    return {
      messages: [`Shadow Retention Critic: [Result: ${result.score}/10] Note: ${result.feedback}`],
      retentionScore: result.score,
      criticNotes: result.feedback,
      ytCriticIterations: state.ytCriticIterations + 1
    };
  } catch (e) {
    console.error("Retention Critic Error:", e);
    return {
      messages: [`Shadow Retention Critic: System Error. Defaulting to safe score.`],
      retentionScore: 5
    };
  }
}

async function productionBundlerAgent(state: typeof AgentState.State) {
  try {
    console.log("HEARTBEAT: [Production Bundler] Entry");
    console.log("LOG: [Production Bundler] Generating asset package...");
    
    const PROD_SCHEMA = z.object({
      thumbnailConcepts: z.array(z.object({ title: z.string(), prompt: z.string() })).default([]),
      brollChecklist: z.array(z.string()).default([]),
      sfxChecklist: z.array(z.string()).optional(),
      vfxRequirements: z.array(z.string()).optional(),
      musicInspiration: z.string().optional(),
      voiceGuidance: z.string().optional()
    });

    // Use evaluatorLlm (70b) for production bundle to ensure zero-failure extraction
    // Use nurseLlm (8b) for production organization
    const generator = nurseLlm.withStructuredOutput(PROD_SCHEMA, { name: "generate_production_bundle", method: "jsonMode" });
    const result = await generator.invoke([
      new SystemMessage(`You are a Professional Production Director. 
Your goal is to extract every technical requirement needed for the final video edit in JSON FORMAT.
1. Thumbnail Concepts: 3 viral, high-contrast ideas.
2. B-Roll Checklist: 5-8 descriptive shots for an editor.
3. SFX Checklist: Identify where impact sounds, whooshes, or ambient loops are needed.
4. VFX/MGFX: Identify text overlays, callouts, or data visualizations.
5. Music: Describe the BPM, mood, and genre.
6. Voiceover: Direct the narrator on tone (e.g. "Hyper-enthusiastic" vs "Grave and serious").`),
      new HumanMessage(`SCRIPT:\n${state.draftInfo}\nVISUAL CUES:\n${state.visualCues}\n\nReturn ONLY a JSON object.`)
    ]);

    // THIRD PASS: Final Sanitization for Teleprompter
    const cleanerRes = await nurseLlm.invoke([
       new SystemMessage("You are a Teleprompter Editor. Extract ONLY the narrator's spoken lines from the script. Remove all SFX tags, visual descriptions, timing markers (e.g. 0:00), and headers. Return a clean, flowing narrative script."),
       new HumanMessage(`Source Script:\n${state.draftInfo}`)
    ]);

    // Merge with existing bundle
    const updatedBundle = {
      ...state.productionBundle,
      ...result,
      cleanNarratorScript: cleanerRes.content as string
    };

    // Save bundle to Supabase
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      const { error } = await supabase.from('drafts')
        .update({ production_bundle: updatedBundle })
        .eq('project_id', state.projectId)
        .eq('iteration', state.iterations);

      if (error) {
        console.error("Supabase production bundle update error:", error.message);
        throw new Error(`Bundle Persistence Error: ${error.message}`);
      }
    }

    return {
      messages: ["Production: [Progress: 4/6] Assets and thumbnails bundled."],
      productionBundle: updatedBundle,
    };
  } catch (e) {
    console.error("Production Bundler Error:", e);
    return { messages: [`System Error (Production Bundler): ${e instanceof Error ? e.message : "Failed"}`] };
  }
}

// ==========================================
// 4. STRATEGIC INTEL AGENT ( Industrial Channel Mode )
// ==========================================
export async function strategicIntelAgent(state: typeof AgentState.State) {
  try {
    console.log("LOG: [Strategic Intel] Brainstorming viral concepts...");
    const latestMessage = state.messages[state.messages.length - 1] || "general niche";

    const systemPrompt = `You are a World-Class YouTube Strategist for High-Revenue Channels (10M+ subs). 
Your goal is to identify 5 VIRAL, HIGH-CONFLICT video concepts based on the provided niche.

=== STRATEGIC MANDATES ===
1. **CONFLICT AS CURRENCY**: Every video must have an antagonist, a struggle, or a high-stakes failure. No "explaining" things. Every concept must be a "Battle".
2. **PATTERN INTERRUPTS**: The hook must be visceral. If it's a "mysterious lab", it's failing or being deleted.
3. **CURIOSITY GAPS**: Use "The [Subject] That [Action] Everything" or "I [Action] For [Time] And [Outcome]" frameworks if appropriate, but avoid AI clichés.
4. **KIDS SPACE SPECIFIC**: Kids love "The vs That", "Giant versions", and "Solving the impossible".

IMPORTANT: You MUST return ONLY a valid JSON object with the following structure:
{
  "suggestions": [
    {
      "title": "Viral, High-Conflict Title",
      "reasoning": "Industrial strategy reasoning",
      "hook": "Visceral, 3-second pattern interrupt"
    }
  ]
}`;

    const response = await bossLlm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Channel Niche Context: ${state.nicheData}
      Current Strategy Request: ${latestMessage}`)
    ], {
      response_format: { type: "json_object" }
    } as any);

    const content = response.content as string;
    const parsed = JSON.parse(content);

    return {
      suggestions: parsed.suggestions || [],
      messages: ["Strategist: I've identified 5 high-potential video concepts for your channel."]
    };
  } catch (error) {
    console.error("ERROR: [Strategic Intel Agent] Failed:", error);
    return {
      suggestions: [],
      messages: ["Strategist: I encountered an error and couldn't generate concepts at this time."]
    };
  }
}
// ==========================================
// 4b. INTENT CLASSIFIER (Conversational Autonomy)
// ==========================================
async function intentClassifierAgent(state: typeof AgentState.State) {
  try {
    const latestMessage = state.messages[state.messages.length - 1] || "";
    
    // GUARD: If intent is already pre-set (e.g. from UI or Test), respect it
    if (state.intent !== "NONE") {
      console.log(`LOG: [Intent Classifier] Respecting Pre-set Intent: ${state.intent}`);
      return { intent: state.intent };
    }

    console.log("LOG: [Intent Classifier] Parsing user command...");

    // If it's the very first message and looks like a generic idea, it's FULL production
    if (state.iterations === 0 && latestMessage.length > 20) {
      return { intent: "FULL" as const };
    }

    const systemPrompt = `You are a Studio Orchestrator. 
Analyze the user's request and categorize it into ONE of these intents:
- 'INTEL': Researching niches, CPM, or competitor gaps.
- 'DRAFT': Writing or rewriting a script.
- 'CRITIC': Reviewing or scoring a script.
- 'VISUALS': Generating B-roll, thumbnails, or visual cues.
- 'FULL': Starting a complete end-to-end production.

IMPORTANT: Return ONLY the category name.`;

    const response = await nurseLlm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(latestMessage)
    ]);

    const intentText = response.content.toString().toUpperCase();
    let intent: any = "FULL";
    if (intentText.includes("INTEL")) intent = "INTEL";
    else if (intentText.includes("DRAFT")) intent = "DRAFT";
    else if (intentText.includes("CRITIC")) intent = "CRITIC";
    else if (intentText.includes("VISUALS")) intent = "VISUALS";

    console.log(`LOG: [Intent Classifier] Detected Intent: ${intent}`);

    return { intent };
  } catch (error) {
    console.error("ERROR: [Intent Classifier] Failed:", error);
    return { intent: "FULL" as const };
  }
}

// ==========================================
// 5. Define the Edges (The Flowchart Router)
// ==========================================

function modeRouter(state: typeof AgentState.State) {
  // If we have a specific intent from the classifier, use it
  if (state.intent === "INTEL") return "nicheArchitect";
  if (state.intent === "DRAFT") return "hookScientist";
  if (state.intent === "CRITIC") return "retentionCritic";
  if (state.intent === "VISUALS") return "visualist";

  // Default legacy behavior
  return state.contentMode === "YOUTUBE" ? "nicheArchitect" : "outliner";
}

function retentionRouting(state: typeof AgentState.State) {
  if (state.retentionScore >= 8 || state.ytCriticIterations >= 2) {
    return "visualist";
  } else {
    return "hookScientist";
  }
}

function reviewRouting(state: typeof AgentState.State) {
  // Guardrail: Max 3 rewrites to prevent infinite loops
  if (state.criticScore >= 8 || state.iterations >= 3) {
    return "__end__";
  } else {
    return "drafter";
  }
}

// ==========================================
// 5. Draw the Graph
// ==========================================

export const graph = new StateGraph(AgentState)
  // CORE NODES
  .addNode("intentClassifier", intentClassifierAgent)
  // FILM NODES
  .addNode("outliner", outlinerAgent)
  .addNode("drafter", drafterAgent)
  .addNode("critic", criticAgent)
  // YOUTUBE NODES
  .addNode("nicheArchitect", nicheArchitectAgent)
  .addNode("intel", intelAgent)
  .addNode("hookScientist", hookScientistAgent)
  .addNode("retentionCritic", retentionCriticAgent)
  .addNode("visualist", visualistAgent)
  .addNode("production", productionBundlerAgent)
  .addNode("compliance", complianceAgent)
  .addNode("strategicIntel", strategicIntelAgent)
  // ROUTING POINT
  .addEdge("__start__", "intentClassifier")
  .addConditionalEdges("intentClassifier", modeRouter)
  // FILM FLOW
  .addEdge("outliner", "drafter")
  .addEdge("drafter", "critic")
  .addConditionalEdges("critic", reviewRouting)
  // YOUTUBE FLOW
  .addEdge("nicheArchitect", "intel")
  .addEdge("intel", "hookScientist")
  .addEdge("hookScientist", "retentionCritic")
  .addConditionalEdges("retentionCritic", retentionRouting)
  .addEdge("visualist", "production")
  .addEdge("production", "compliance")
  .addEdge("compliance", "__end__");

export const compiledGraph = graph.compile();
