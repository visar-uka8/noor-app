import { getSupabase } from "@/lib/supabase";

export async function buildApiAuthHeaders(
  withJson = false,
): Promise<HeadersInit> {
  const supabase = getSupabase();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("API auth user error:", userError.message);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    ...(withJson ? { "Content-Type": "application/json" } : {}),
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}
