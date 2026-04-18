import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Testing Supabase connection...");
console.log("URL:", supabaseUrl);
console.log("Key Prefix:", supabaseKey?.substring(0, 10));

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing keys!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    const { data, error } = await supabase.from("channels").select("*").limit(1);
    if (error) {
      console.error("Connection failed:", error.message);
    } else {
      console.log("Connection successful! Data:", data);
    }
  } catch (e) {
    console.error("Unexpected error:", e);
  }
}

test();
