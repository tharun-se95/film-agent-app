import { getSupabaseAdminClient } from "@/utils/supabase";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channel_id");

  if (!channelId) {
    return NextResponse.json({ error: "channel_id is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not initialized" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("channel_suggestions")
    .select("*")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("--- SUPABASE ERROR [Suggestions GET] ---");
    console.error("Channel ID:", channelId);
    console.error("Error Object:", JSON.stringify(error, null, 2));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not initialized" }, { status: 500 });
  }

  const { error } = await supabase
    .from("channel_suggestions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("--- SUPABASE ERROR [Suggestions DELETE] ---");
    console.error("ID:", id);
    console.error("Error Object:", JSON.stringify(error, null, 2));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
  const { id, status } = await req.json();

  if (!id || !status) {
    return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not initialized" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("channel_suggestions")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("--- SUPABASE ERROR [Suggestions PATCH] ---");
    console.error("ID:", id);
    console.error("Status Update:", status);
    console.error("Error Object:", JSON.stringify(error, null, 2));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
