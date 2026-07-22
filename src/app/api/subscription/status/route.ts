import { createClient } from "@/lib/supabase/server";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import {
  checkFamilyMemberQuota,
  checkLabAnalysisQuota,
  getUserSubscription,
  resolveEffectiveTier,
} from "@/lib/subscription";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const subscription = await getUserSubscription(supabase, user.id);
    const effectiveTier = resolveEffectiveTier(
      subscription.tier,
      subscription.status,
    );
    const labQuota = await checkLabAnalysisQuota(supabase, user.id);
    const familyQuota = await checkFamilyMemberQuota(supabase, user.id);

    return Response.json({
      subscription: {
        tier: subscription.tier,
        effectiveTier,
        status: subscription.status,
        isPaidActive: subscription.isPaidActive,
      },
      labQuota,
      familyQuota,
    });
  } catch (error) {
    console.error("Subscription status failed", error);
    return Response.json(
      { error: "Abonnementstatus konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}
