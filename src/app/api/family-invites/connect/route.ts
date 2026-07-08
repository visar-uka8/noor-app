import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  familyInviteErrors,
  familyRelationships,
  type FamilyRelationship,
} from "@/types/family-connect";

export const runtime = "nodejs";

type ConnectPayload = {
  code?: unknown;
  relationship?: unknown;
};

type StoredInvite = {
  id: string;
  patient_id: string;
  code: string;
  expires_at: string;
  used: boolean;
};

type PatientProfile = {
  first_name: string;
  last_name: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ConnectPayload;
    const code = normalizeCode(payload.code);
    const relationship = normalizeRelationship(payload.relationship);

    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Bitte melden Sie sich an, um sich zu verbinden." },
        { status: 401 },
      );
    }

    const supabase = createSupabaseDataClient() ?? authSupabase;
    const { data: invite, error } = await supabase
      .from("family_invites")
      .select("id, patient_id, code, expires_at, used")
      .eq("code", code)
      .maybeSingle<StoredInvite>();

    if (error) throw error;

    if (!invite) {
      return Response.json(
        { error: familyInviteErrors.invalid, code: "invalid" },
        { status: 404 },
      );
    }

    if (invite.used) {
      return Response.json(
        { error: familyInviteErrors.used, code: "used" },
        { status: 409 },
      );
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return Response.json(
        { error: familyInviteErrors.expired, code: "expired" },
        { status: 410 },
      );
    }

    if (invite.patient_id === user.id) {
      return Response.json(
        { error: "Sie können sich nicht mit Ihrem eigenen Code verbinden." },
        { status: 400 },
      );
    }

    const { error: markUsedError } = await supabase
      .from("family_invites")
      .update({ used: true })
      .eq("id", invite.id);

    if (markUsedError) throw markUsedError;

    const { error: linkError } = await supabase.from("family_links").insert({
      patient_id: invite.patient_id,
      family_member_id: user.id,
      relationship,
      active: true,
    });

    if (linkError) throw linkError;

    // Caretakers keep their patient role if they already use Noor for themselves.
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: string }>();

    if (currentProfile?.role !== "patient") {
      const { error: roleError } = await supabase
        .from("profiles")
        .update({ role: "family_member" })
        .eq("id", user.id);

      if (roleError) {
        console.error("Family connect role update failed", roleError);
      }
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
      connected: true,
      patientId: invite.patient_id,
      patientName,
      dashboardUrl: "/dashboard",
    });
  } catch (error) {
    console.error("Family connect failed", error);

    return Response.json(
      { error: "Verbindung konnte gerade nicht hergestellt werden." },
      { status: 500 },
    );
  }
}

function normalizeCode(code: unknown) {
  if (typeof code !== "string") {
    throw new Error("Invitation code is required.");
  }

  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

  if (normalized.length !== 6) {
    throw new Error("Invitation code must be 6 characters.");
  }

  return normalized;
}

function normalizeRelationship(
  relationship: unknown,
): FamilyRelationship {
  if (
    typeof relationship === "string" &&
    familyRelationships.includes(relationship as FamilyRelationship)
  ) {
    return relationship as FamilyRelationship;
  }

  throw new Error("Relationship is required.");
}

function createSupabaseDataClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createAdminClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}
