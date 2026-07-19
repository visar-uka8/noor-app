import { createClient as createAdminClient } from "@supabase/supabase-js";

/** Service-role client only — never anon key (anon has no user JWT → RLS failures). */
export function createSupabaseDataClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export function isUsingServiceRoleClient() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
