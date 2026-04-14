import { compiledGraph } from "@/agent/graph";
import { getSupabaseAdminClient } from "@/utils/supabase";
import { logAgentExecution } from "@/utils/logger";

export async function POST(req: Request) {
  try {
    const { prompt, projectId } = await req.json();
    console.log("--- AGENT START ---");
    console.log("Project ID:", projectId);
    console.log("Prompt:", prompt.slice(0, 50));

    const supabase = getSupabaseAdminClient();
    let initialState: any = {
      messages: [prompt],
      projectId: projectId,
      contentMode: "FILM", // Default, will be updated by project hydration
      latestCommand: prompt // Explicit field for Intent Classifier
    };

    logAgentExecution(projectId, { type: "START", prompt, initialState });

    // HYDRATION: If project exists AND is a valid UUID, fetch the latest draft
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    if (supabase && projectId && isUUID(projectId)) {
      console.log("TRACING: Fetching project metadata...");
      // First, fetch the project to get the content_mode
      const { data: project, error: pError } = await supabase
        .from("projects")
        .select("content_mode")
        .eq("id", projectId)
        .maybeSingle();

      if (pError) console.error("TRACING ERROR (Project):", pError);

      console.log("TRACING: Fetching latest draft...");
      const { data: latestDraft, error: dError } = await supabase
        .from("drafts")
        .select("*")
        .eq("project_id", projectId)
        .order("iteration", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dError) console.error("TRACING ERROR (Draft):", dError);

      if (project) {
        console.log("Found Project Mode:", project.content_mode);
        initialState.contentMode = project.content_mode;
      } else {
        console.warn("WARNING: Project Record not found in DB for ID:", projectId);
      }

      if (latestDraft) {
        console.log("Hydrating from Draft iteration:", latestDraft.iteration);
        initialState = {
          ...initialState,
          outline: latestDraft.prompt_context || "",
          draftInfo: latestDraft.content || "",
          criticNotes: latestDraft.critic_notes || "",
          iterations: latestDraft.iteration,
          nicheData: latestDraft.niche_data || "",
          visualCues: latestDraft.visual_cues || "",
          ytMetadata: latestDraft.yt_metadata || null,
          productionBundle: latestDraft.production_bundle || null,
          historicalFeedback: latestDraft.critic_notes ? [latestDraft.critic_notes] : [],
        };
      }
    }

    console.log("--- FINAL INITIAL STATE ---");
    console.log("Content Mode:", initialState.contentMode);
    console.log("Iterations:", initialState.iterations || 0);
    
    console.log("Starting Graph Stream...");
    const stream = await compiledGraph.stream(initialState);
    console.log("Stream successfully initialized.");

    const encoder = new TextEncoder();
    
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          // Log each step to file
          logAgentExecution(projectId, { type: "CHUNK", chunk });
          
          // Send each chunk to the client as Server-Sent Events (SSE)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
        logAgentExecution(projectId, { type: "SUCCESS", message: "Stream finished." });
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      }
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Agent Failed" }), { status: 500 });
  }
}
