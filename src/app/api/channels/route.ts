import { getSupabaseAdminClient } from "@/utils/supabase";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return new Response(JSON.stringify([]), { status: 200 });

  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .order("name", { ascending: true });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return new Response(JSON.stringify({ error: "No DB" }), { status: 500 });

  const { name, niche, brand_voice } = await req.json();
  const { data, error } = await supabase
    .from("channels")
    .insert([{ 
      name, 
      niche: niche || "",
      brand_voice: brand_voice || ""
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
    .from("channels")
    .delete()
    .eq("id", id);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

export async function PATCH(req: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return new Response(JSON.stringify({ error: "No DB" }), { status: 500 });

  const { id, name, niche, brand_voice } = await req.json();
  if (!id) return new Response(JSON.stringify({ error: "Missing ID" }), { status: 400 });

  const { data, error } = await supabase
    .from("channels")
    .update({ 
      name, 
      niche, 
      brand_voice 
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
}
