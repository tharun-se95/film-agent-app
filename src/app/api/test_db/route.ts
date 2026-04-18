import { getSupabaseClient, getSupabaseAdminClient } from "@/utils/supabase";

export async function GET() {
  const publicClient = getSupabaseClient();
  const adminClient = getSupabaseAdminClient();
  
  const results: any = {
    diagnostics: "v2.0 (Resilient Client)",
    timestamp: new Date().toISOString(),
    env: {
      url_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon_present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      secret_present: !!process.env.SUPABASE_SECRET_KEY,
      groq_present: !!process.env.GROQ_API_KEY
    }
  };

  const testClient = async (name: string, client: any) => {
    if (!client) return { status: "missing", error: "Client skipped (no keys)" };
    const start = Date.now();
    try {
      const { data, error } = await client.from("channels").select("count", { count: 'exact', head: true });
      return {
        status: error ? "error" : "success",
        duration_ms: Date.now() - start,
        error: error ? error.message : null,
        data_count: data
      };
    } catch (e) {
      return {
        status: "crash",
        duration_ms: Date.now() - start,
        error: e instanceof Error ? e.message : "Unknown crash"
      };
    }
  };

  results.public_test = await testClient("Public", publicClient);
  results.admin_test = await testClient("Admin", adminClient);

  const status = (results.public_test.status === "success" || results.admin_test.status === "success") ? 200 : 500;
  
  return new Response(JSON.stringify(results, null, 2), { 
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
