import { getSupabaseAdminClient } from "@/utils/supabase";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return new Response(JSON.stringify({ error: "Missing Project ID" }), { status: 400 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return new Response(JSON.stringify([]), { status: 200 });

  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .eq("project_id", projectId)
    .order("iteration", { ascending: true });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
}
