import { createClient } from "@supabase/supabase-js";
import {
  demoPatientId,
  relationships,
  type Relationship,
} from "@/types/family-invitations";

export const runtime = "nodejs";

type CreateInvitationPayload = {
  familyMemberName?: unknown;
  relationship?: unknown;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreateInvitationPayload;
    const familyMemberName = normalizeName(payload.familyMemberName);
    const relationship = normalizeRelationship(payload.relationship);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const invitation = {
      code: generateInvitationCode(),
      patient_id: demoPatientId,
      family_member_name: familyMemberName,
      relationship,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: "pending",
    };

    const supabase = createSupabaseAdminClient();

    if (!supabase) {
      return Response.json({
        stored: false,
        reason: "Supabase ist lokal noch nicht konfiguriert.",
        invitation: toClientInvitation(invitation),
      });
    }

    const { error } = await supabase
      .from("family_invitations")
      .insert(invitation);

    if (error) throw error;

    return Response.json({
      stored: true,
      invitation: toClientInvitation(invitation),
    });
  } catch (error) {
    console.error("Family invitation creation failed", error);

    return Response.json(
      { error: "Einladung konnte gerade nicht erstellt werden." },
      { status: 500 },
    );
  }
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

function generateInvitationCode() {
  return crypto.getRandomValues(new Uint32Array(1))[0]
    .toString()
    .slice(-6)
    .padStart(6, "0");
}

function normalizeName(name: unknown) {
  if (typeof name !== "string" || name.trim().length < 2) {
    throw new Error("Family member name is required.");
  }

  return name.trim();
}

function normalizeRelationship(relationship: unknown): Relationship {
  if (
    typeof relationship === "string" &&
    relationships.includes(relationship as Relationship)
  ) {
    return relationship as Relationship;
  }

  throw new Error("Relationship is required.");
}

function toClientInvitation(invitation: {
  code: string;
  patient_id: string;
  family_member_name: string;
  relationship: Relationship;
  created_at: string;
  expires_at: string;
  status: string;
}) {
  return {
    code: invitation.code,
    patientId: invitation.patient_id,
    familyMemberName: invitation.family_member_name,
    relationship: invitation.relationship,
    createdAt: invitation.created_at,
    expiresAt: invitation.expires_at,
    status: invitation.status,
  };
}
