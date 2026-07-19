import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/request-auth";
import { createSupabaseDataClient } from "@/lib/supabase-data";

export const runtime = "nodejs";

type StoredInvite = {
  patient_id: string;
  expires_at: string;
  used: boolean;
};

type PatientProfile = {
  first_name: string | null;
  last_name: string | null;
};

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request);

    if (!user) {
      return Response.json(
        { error: "Bitte melden Sie sich an." },
        { status: 401 },
      );
    }

    const code = new URL(request.url).searchParams
      .get("code")
      ?.toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);

    if (!code || code.length !== 6) {
      return Response.json({ error: "Code ungültig." }, { status: 400 });
    }

    const supabase = createSupabaseDataClient() ?? (await createClient());
    const { data: invite, error } = await supabase
      .from("family_invites")
      .select("patient_id, expires_at, used")
      .eq("code", code)
      .maybeSingle<StoredInvite>();

    if (error) throw error;

    if (
      !invite ||
      invite.used ||
      new Date(invite.expires_at).getTime() < Date.now()
    ) {
      return Response.json({ found: false, patientName: null });
    }

    if (invite.patient_id === user.id) {
      return Response.json({
        found: true,
        patientName: null,
        ownCode: true,
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", invite.patient_id)
      .maybeSingle<PatientProfile>();

    const patientName =
      profile?.first_name?.trim() ||
      profile?.last_name?.trim() ||
      "Ihrem Angehörigen";

    return Response.json({
      found: true,
      patientName,
      ownCode: false,
    });
  } catch (error) {
    console.error("Family invite lookup failed", error);
    return Response.json(
      { error: "Code konnte gerade nicht geprüft werden." },
      { status: 500 },
    );
  }
}
