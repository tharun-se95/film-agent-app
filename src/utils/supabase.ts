import { createClient } from "@supabase/supabase-js";

// Attempt to load from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// We use a safe factory function so the application doesn't crash 
// at boot if the user hasn't supplied the keys yet.
export const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase keys are missing. Database persistence is disabled.");
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
};

// ADMIN CLIENT: Uses the secret key to bypass RLS for server-side operations
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || "";

export const getSupabaseAdminClient = () => {
  if (!supabaseUrl || !supabaseSecret) {
    console.warn("Supabase Secret Key is missing. Admin operations disabled.");
    // Fallback to regular client if secret is missing but anon is present
    return getSupabaseClient();
  }
  return createClient(supabaseUrl, supabaseSecret);
};
