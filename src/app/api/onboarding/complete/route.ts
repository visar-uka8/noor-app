import { completeOnboarding } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/request-auth";
import { createSupabaseDataClient } from "@/lib/supabase-data";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, authError } = await getAuthenticatedUser(request);

  if (authError || !user) {
    return Response.json({ error: "Bitte melden Sie sich an." }, { status: 401 });
  }

  const supabase = createSupabaseDataClient() ?? (await createClient());
  const state = await completeOnboarding(supabase, user.id);

  if (!state) {
    return Response.json(
      { error: "Onboarding ist noch nicht eingerichtet." },
      { status: 503 },
    );
  }

  return Response.json({ onboarding: state });
}
