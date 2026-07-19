"use client";

import { createClient as createBrowserClient } from "./client";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/** Shared browser Supabase client — keeps the active auth session. */
export function getSupabase() {
  browserClient ??= createBrowserClient();
  return browserClient;
}

export const supabase = getSupabase();

export { createClient } from "./client";
