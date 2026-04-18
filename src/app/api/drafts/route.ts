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

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, production_bundle } = body;

    if (!id) return new Response(JSON.stringify({ error: "Missing Draft ID" }), { status: 400 });

    const supabase = getSupabaseAdminClient();
    if (!supabase) return new Response(JSON.stringify({ error: "Storage disabled" }), { status: 500 });

    const { data, error } = await supabase
      .from("drafts")
      .update({ production_bundle })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
