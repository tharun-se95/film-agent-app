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
const MODEL_NAME = "llama-3.3-70b-versatile"; 

// CREATIVE LLM: High temperature for brainstorming and script writing
const creativeLlm = new ChatOpenAI({
  modelName: MODEL_NAME,
  temperature: 0.8,
  apiKey: API_KEY,
  configuration: { baseURL: BASE_URL },
  timeout: 15000 // Prevent perpetual hangs
});

// EVALUATOR LLM: Zero temperature for strict, deterministic logic and grading
const evaluatorLlm = new ChatOpenAI({
  modelName: MODEL_NAME,
  temperature: 0.0,
  apiKey: API_KEY,
  configuration: { baseURL: BASE_URL },
  timeout: 15000 // Strict enforcement for logic steps
});

// Zod Schema for Strategic Suggestions
const StrategicSchema = z.object({
  suggestions: z.array(z.object({
    title: z.string().describe("The viral video title."),
    reasoning: z.string().describe("Why this fits the current niche gap."),
    hook: z.string().describe("The suggested pattern interrupt for the first 3 seconds.")
  })).describe("A list of 5 high-potential video concepts.")
});

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
    voiceGuidance: string;
  }>({
    reducer: (current, update) => update,
    default: () => ({ thumbnailConcepts: [], brollChecklist: [], voiceGuidance: "" }),
  }),
  ytCriticIterations: Annotation<number>({
    reducer: (current, update) => current + update,
    default: () => 0,
  }),
  // Strategic Suggestions (Industrial Mode)
  suggestions: Annotation<{ title: string; reasoning: string; hook: string }[]>({
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
      const response = await creativeLlm.invoke([
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
    const response = await creativeLlm.invoke([
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
    console.log(`LOG: [Drafter] Starting... Iteration: ${state.iterations}, Outline Length: ${state.outline?.length || 0}`);
    
    // LOGIC FIX: Find the actual user instruction by filtering out agent-prefixed logs
    const instructionLogs = state.messages.filter(m => 
      !m.startsWith("Outliner:") && 
      !m.startsWith("Drafter:") && 
      !m.startsWith("Critic:") &&
      !m.startsWith("System:")
    );
    const latestUserMessage = instructionLogs[instructionLogs.length - 1] || state.messages[0];
    
    let finalPrompt = `Write a comprehensive screenplay scene based on this plot outline:\n\n${state.outline}\n\nInitial Ideas: ${latestUserMessage}\n\nFocus on vivid scene descriptions and nuanced dialogue. Keep the scene tight and cinematic.`;
    
    if (state.iterations > 0) {
       const historyLog = state.historicalFeedback.map((fb, idx) => `Rewrite ${idx + 1} Feedback:\n${fb}`).join("\n\n");
       finalPrompt = `You must REWRITE the screenplay scene based on NEW User Instructions and previous Critic Feedback.\n\nOutline: ${state.outline}\n\nPrevious Draft:\n${state.draftInfo}\n\n--- NEW USER INSTRUCTIONS ---\n${latestUserMessage}\n\n--- LATEST CRITIC NOTES ---\n${state.criticNotes}`;
    }

    const response = await creativeLlm.invoke([
      new SystemMessage("You are an award-winning Screenwriter. Write visually stunning, emotionally rich scenes. Do not use asterisks or markdown bolding, just pure text caps for names. Ensure your output is substantial but stays focused on the key scene beats."),
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
      messages: ["Drafter Agent finished writing the scene."],
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
    console.log("LOG: [Critic] Starting evaluation...");
    
    // Use .withStructuredOutput() to force LLM to return JSON validated by our Zod schema
    const analyzer = evaluatorLlm.withStructuredOutput(CriticSchema, { name: "evaluate_script", method: "functionCalling" });

    const prompt = `You are a harsh but fair Hollywood Script Critic. Critique this screenplay draft carefully. Focus on pacing, character voice, and action.\n\nDraft:\n${state.draftInfo}`;
    
    const result = await analyzer.invoke([
      new SystemMessage("Analyze the text strictly. You are interacting via an API so you MUST return only valid JSON matching the exact schema provided."),
      new HumanMessage(prompt)
    ]);

    // Update the existing Supabase row with critic data
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      const { error } = await supabase.from('drafts')
        .update({ critic_score: result.score, critic_notes: result.feedback })
        .eq('project_id', state.projectId)
        .eq('iteration', state.iterations);
        
      if (error) {
        console.error("Supabase critic update error:", error.message);
        throw new Error(`Critic Persistence Error: ${error.message}`);
      }
    }

    return {
      messages: [`Critic Agent evaluated draft. Score: ${result.score}/10.`],
      criticScore: result.score,
      criticNotes: result.feedback,
      historicalFeedback: [result.feedback]
    };
  } catch (e) {
    console.error("Critic Error:", e);
    return {
      messages: [`System Error (Critic): ${e instanceof Error ? e.message : "Failed to evaluate script"}`],
      criticScore: 5 // Default middle score on error to allow flow to continue if needed
    };
  }
}

// ==========================================
// 3b. New YouTube Strategist Nodes
// ==========================================

async function intelAgent(state: typeof AgentState.State) {
  try {
    console.log("HEARTBEAT: [Intel] Entry");
    console.log("LOG: [Intel] Starting niche discovery...");
    const latestMessage = state.messages[state.messages.length - 1];
    
    // In a real app, this would use Tavily/Serper tools. For now, simulated.
    const response = await evaluatorLlm.invoke([
      new SystemMessage("You are a YouTube Market Intelligence Agent. Analyze the niche, CPM potential, and competitor metrics. Identify a 'Viral Angle' for the provided topic."),
      new HumanMessage(`Topic: ${latestMessage}\n\nProvide Niche Intel, estimated CPM, and competitor gaps.`)
    ]);

    // Persist niche data to Supabase (Initial insert for this iteration)
    const supabase = getSupabaseAdminClient();
    const nextIteration = state.iterations + 1;

    if (supabase) {
      // We use upsert to allow retry logic in the same iteration if needed
      const { error } = await supabase.from('drafts').upsert({ 
        project_id: state.projectId,
        niche_data: response.content as string,
        iteration: nextIteration,
        prompt_context: latestMessage
      }, { onConflict: 'project_id, iteration' });

      if (error) {
        console.error("Supabase intel storage error:", error.message);
        throw new Error(`Intel Persistence Error: ${error.message}`);
      }
    }

    // AUDIT: Log raw AI response
    logAgentExecution(state.projectId, `[INTEL RESPONSE]\n${response.content}`);

    return {
      messages: ["Intel: Identified viral niche angle and competitor gaps."],
      nicheData: response.content as string,
      iterations: 1, // Increment iterations for the YouTube flow too!
    };
  } catch (e) {
    console.error("Intel Error:", e);
    return { messages: [`System Error (Intel): ${e instanceof Error ? e.message : "Failed"}`] };
  }
}

async function hookScientistAgent(state: typeof AgentState.State) {
  try {
    console.log("HEARTBEAT: [Hook Scientist] Entry");
    console.log("LOG: [Hook Scientist] Engineering first 3 seconds...");
    const response = await creativeLlm.invoke([
      new SystemMessage("You are a YouTube Scriptwriting Expert. Write a COMPLETE, COMPREHENSIVE, AND CINEMATIC script. Your goal is a 10-minute video duration (approx 1500 words). DO NOT just focus on the intro; write the entire narrative arc. CRITICAL: The first 3 seconds MUST have a psychological pattern interrupt."),
      new HumanMessage(`Niche Data: ${state.nicheData}\n\nWrite the FULL, COMPLETE script for this video. Include all sections, transitions, and the final call-to-action. Ensure the content is deep and engaging throughout.`)
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
      messages: ["Hook Scientist: Engineered high-retention script with pattern interrupts."],
      draftInfo: response.content as string,
      hooks: [response.content.toString().substring(0, 500)], // Store start of script as hook sample
    };
  } catch (e) {
    console.error("Hook Scientist Error:", e);
    return { messages: [`System Error (Hook Scientist): ${e instanceof Error ? e.message : "Failed"}`] };
  }
}

async function visualistAgent(state: typeof AgentState.State) {
  try {
    console.log("HEARTBEAT: [Visualist] Entry");
    console.log("LOG: [Visualist] Mapping B-roll and visual cues...");
    const response = await creativeLlm.invoke([
      new SystemMessage("You are a Video Editor & Visual Designer. Read the script and add detailed visual cues, B-Roll notes, and Stock footage prompts to every paragraph. Format as [Visual: <Description>]"),
      new HumanMessage(`Script:\n${state.draftInfo}`)
    ]);

    // Update draft with visual cues
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      const { error } = await supabase.from('drafts')
        .update({ visual_cues: response.content as string })
        .eq('project_id', state.projectId)
        .eq('iteration', state.iterations);
        
      if (error) {
        console.error("Supabase visualist storage error:", error.message);
        throw new Error(`Visualist Persistence Error: ${error.message}`);
      }
    }

    // AUDIT: Log raw AI response
    logAgentExecution(state.projectId, `[VISUALIST RESPONSE]\n${response.content}`);

    return {
      messages: ["Visualist: Mapped B-Roll and visual cues across the script."],
      visualCues: response.content as string,
    };
  } catch (e) {
    console.error("Visualist Error:", e);
    return { messages: [`System Error (Visualist): ${e instanceof Error ? e.message : "Failed"}`] };
  }
}

async function complianceAgent(state: typeof AgentState.State) {
  try {
    console.log("HEARTBEAT: [Compliance] Entry");
    console.log("LOG: [Compliance] Generating SEO & Metadata...");
    const SEO_SCHEMA = z.object({
      title: z.string(),
      description: z.string(),
      tags: z.array(z.string())
    });
    
    const analyzer = evaluatorLlm.withStructuredOutput(SEO_SCHEMA, { name: "generate_seo", method: "functionCalling" });
    const result = await analyzer.invoke([
      new SystemMessage("You are a YouTube SEO Expert. Generate a viral title, descriptive meta description, and high-performance tags."),
      new HumanMessage(`Script:\n${state.draftInfo}\nVisuals:\n${state.visualCues}`)
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
      messages: ["Compliance: Optimized SEO metadata for maximum search visibility."],
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
    console.log("LOG: [Retention Critic] Evaluating drop-off risk...");
    const RETENTION_SCHEMA = z.object({
      score: z.number().min(1).max(10).describe("Retention and Hook score."),
      feedback: z.string().describe("Specific notes for the hook scientist.")
    });

    const analyzer = evaluatorLlm.withStructuredOutput(RETENTION_SCHEMA, { name: "evaluate_retention", method: "functionCalling" });
    const result = await analyzer.invoke([
      new SystemMessage("You are a YouTube Retention Expert. Evaluate if the script has a strong 3s hook and pattern interrupts every 30s. Be extremely critical."),
      new HumanMessage(`Script:\n${state.draftInfo}`)
    ]);

    // AUDIT: Log raw AI response
    logAgentExecution(state.projectId, `[RETENTION CRITIC RESPONSE]\n${JSON.stringify(result, null, 2)}`);

    // Persist to Supabase
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      await supabase.from('drafts')
        .update({ 
          critic_score: result.score,
          critic_notes: result.feedback 
        })
        .eq('project_id', state.projectId)
        .eq('iteration', state.iterations);
    }

    return {
      messages: [`Retention Critic: Analysis complete. Score: ${result.score}/10.`],
      retentionScore: result.score,
      retentionNotes: result.feedback,
      ytCriticIterations: 1
    };
  } catch (e) {
    console.error("Retention Critic Error:", e);
    return { messages: [`System Error (Retention Critic): ${e instanceof Error ? e.message : "Failed"}`] };
  }
}

async function productionBundlerAgent(state: typeof AgentState.State) {
  try {
    console.log("HEARTBEAT: [Production Bundler] Entry");
    console.log("LOG: [Production Bundler] Generating asset package...");
    const PROD_SCHEMA = z.object({
      thumbnailConcepts: z.array(z.object({ title: z.string(), prompt: z.string() })),
      brollChecklist: z.array(z.string()),
      voiceGuidance: z.string()
    });

    const bundler = creativeLlm.withStructuredOutput(PROD_SCHEMA, { name: "generate_production_bundle", method: "functionCalling" });
    const result = await bundler.invoke([
      new SystemMessage("You are a YouTube Production Director. Generate thumbnail concepts, a B-Roll checklist, and voiceover guidance for the script."),
      new HumanMessage(`Script:\n${state.draftInfo}\nVisuals:\n${state.visualCues}`)
    ]);

    // Save bundle to Supabase
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      const { error } = await supabase.from('drafts')
        .update({ production_bundle: result })
        .eq('project_id', state.projectId)
        .eq('iteration', state.iterations);
        
      if (error) {
        console.error("Supabase production bundle update error:", error.message);
        throw new Error(`Bundle Persistence Error: ${error.message}`);
      }
    }

    return {
      messages: ["Production Bundler: Generated comprehensive production checklist and thumbnail concepts."],
      productionBundle: result,
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

    const systemPrompt = `You are a World-Class YouTube Strategist. 
Your goal is to identify 5 VIRAL video concepts based on the provided niche and channel DNA.
Focus on "Conflict", "Curiosity Gaps", and "High-Value Entertainment". 

IMPORTANT: You MUST return ONLY a valid JSON object with the following structure:
{
  "suggestions": [
    {
      "title": "Viral Video Title",
      "reasoning": "Strategy reasoning",
      "hook": "3-second pattern interrupt"
    }
  ]
}`;

    // We use invoke with json_object format for better compatibility with Groq/Llama
    const response = await evaluatorLlm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Channel Niche Context: ${state.nicheData}
      Current Strategy Request: ${latestMessage}`)
    ], { 
      response_format: { type: "json_object" } 
    } as any);

    const content = response.content as string;
    const parsed = JSON.parse(content);

    console.log("LOG: [Strategic Intel] Successfully generated concepts.");

    return {
      suggestions: parsed.suggestions || [],
      messages: ["Strategist: I've identified 5 high-potential video concepts for your channel."]
    };
  } catch (error) {
    console.error("ERROR: [Strategic Intel Agent] Failed:", error);
    // Fallback to empty suggestions instead of crashing the whole flow
    return {
      suggestions: [],
      messages: ["Strategist: I encountered an error and couldn't generate concepts at this time."]
    };
  }
}

// ==========================================
// 5. Define the Edges (The Flowchart Router)
// ==========================================

function modeRouter(state: typeof AgentState.State) {
  return state.contentMode === "YOUTUBE" ? "intel" : "outliner";
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
  // FILM NODES
  .addNode("outliner", outlinerAgent)
  .addNode("drafter", drafterAgent)
  .addNode("critic", criticAgent)
  // YOUTUBE NODES
  .addNode("intel", intelAgent)
  .addNode("hookScientist", hookScientistAgent)
  .addNode("retentionCritic", retentionCriticAgent)
  .addNode("visualist", visualistAgent)
  .addNode("production", productionBundlerAgent)
  .addNode("compliance", complianceAgent)
  .addNode("strategicIntel", strategicIntelAgent)
  // STARTING POINT
  .addConditionalEdges("__start__", modeRouter)
  // FILM FLOW
  .addEdge("outliner", "drafter")
  .addEdge("drafter", "critic")
  .addConditionalEdges("critic", reviewRouting)
  // YOUTUBE FLOW
  .addEdge("intel", "hookScientist")
  .addEdge("hookScientist", "retentionCritic")
  .addConditionalEdges("retentionCritic", retentionRouting)
  .addEdge("visualist", "production")
  .addEdge("production", "compliance")
  .addEdge("compliance", "__end__");

export const compiledGraph = graph.compile();
