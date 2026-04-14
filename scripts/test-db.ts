import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Manually parse .env.local without external dependencies
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return {};
  
  const content = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  
  content.split("\n").forEach(line => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join("=").trim();
    }
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseSecret = env.SUPABASE_SECRET_KEY || "";

console.log("Testing Connection with:");
console.log("URL:", supabaseUrl);
console.log("Secret Length:", supabaseSecret.length);
console.log("Secret Prefix:", supabaseSecret.substring(0, 10));

async function test() {
  if (!supabaseUrl || !supabaseSecret) {
    console.error("Missing credentials in .env.local");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseSecret);

  console.log("\nAttempting to query 'channels' table...");
  const { data, error } = await supabase.from("channels").select("count").limit(1);

  if (error) {
    console.error("\n❌ CONNECTION FAILED!");
    console.error("Error Code:", error.code);
    console.error("Error Message:", error.message);
    console.error("Error Hint:", error.hint);
    console.log("\n--- Recommendation ---");
    if (supabaseSecret.startsWith("sb_secret_")) {
       console.log("Your key starts with 'sb_secret_'. This key is likely for the Management API.");
       console.log("Please use the 'service_role' JWT (starting with 'eyJ...') from Settings -> API.");
    }
  } else {
    console.log("\n✅ CONNECTION SUCCESSFUL!");
    console.log("Data retrieved:", data);
  }
}

test();
