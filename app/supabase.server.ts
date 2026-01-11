import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const SUPABASE_EDGE_BASE_URL = process.env.SUPABASE_EDGE_BASE_URL!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_EDGE_BASE_URL) {
  throw new Error("Missing Supabase env vars (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_EDGE_BASE_URL)");
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
