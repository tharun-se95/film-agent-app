import { getSupabaseAdminClient } from "@/utils/supabase";

export async function GET(req: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return new Response(JSON.stringify([]), { status: 200 });

  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channel_id");

  let query = supabase.from("projects").select("*");
  if (channelId) {
    query = query.eq("channel_id", channelId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return new Response(JSON.stringify({ error: "No DB" }), { status: 500 });

  const { name, original_idea, channel_id, content_mode } = await req.json();
  const { data, error } = await supabase
    .from("projects")
    .insert([{ 
      name, 
      original_idea, 
      channel_id,
      content_mode: content_mode || 'FILM',
      status: 'APPROVED'
    }])
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
}

export async function DELETE(req: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return new Response(JSON.stringify({ error: "No DB" }), { status: 500 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return new Response(JSON.stringify({ error: "Missing ID" }), { status: 400 });

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("API: Deletion error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  console.log("API: Successfully deleted project:", id);
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
