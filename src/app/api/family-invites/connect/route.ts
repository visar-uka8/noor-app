import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/request-auth";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { queryFamilyLinkForPair } from "@/lib/family-links-query";
import { checkFamilyMemberQuota } from "@/lib/subscription";
import {
  getProfileFirstName,
  getProfileLanguage,
  getUserEmail,
  sendFamilyConnectionAlert,
} from "@/lib/notifications";
import {
  familyInviteErrors,
  familyRelationships,
  type FamilyRelationship,
} from "@/types/family-connect";
import type { PostgrestError } from "@supabase/supabase-js";

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

    const { user, authError } = await getAuthenticatedUser(request);

    console.log("User at connect time:", user?.id);
    console.log("Invite code entered:", code);
    console.log("Connect auth error:", authError?.message);

    if (!user) {
      return Response.json(
        { error: "Bitte melden Sie sich an, um sich zu verbinden." },
        { status: 401 },
      );
    }

    const supabase = createSupabaseDataClient() ?? (await createClient());
    let invite = await findValidInvite(supabase, code);

    if (!invite) {
      invite = await findRecoverableInvite(supabase, code, user.id);
    }

    if (!invite) {
      return Response.json(
        { error: familyInviteErrors.invalid, code: "invalid" },
        { status: 404 },
      );
    }

    if (invite.patient_id === user.id) {
      return Response.json(
        { error: "Sie können sich nicht mit Ihrem eigenen Code verbinden." },
        { status: 400 },
      );
    }

    const existingLink = await queryFamilyLinkForPair(
      supabase,
      invite.patient_id,
      user.id,
    );

    if (existingLink?.active !== false) {
      const patientName = await loadPatientName(supabase, invite.patient_id);

      return Response.json({
        connected: true,
        alreadyConnected: true,
        patientId: invite.patient_id,
        patientName,
        dashboardUrl: "/dashboard",
      });
    }

    if (!existingLink) {
      const familyQuota = await checkFamilyMemberQuota(
        supabase,
        invite.patient_id,
      );

      if (!familyQuota.allowed) {
        return Response.json(
          {
            error:
              "Das Familienlimit für diesen Account ist erreicht. Bitte upgraden Sie auf Noor Familie.",
            code: "upgrade_required",
            used: familyQuota.used,
            limit: familyQuota.limit,
          },
          { status: 403 },
        );
      }
    }

    if (existingLink) {
      const { error: reactivateError } = await supabase
        .from("family_links")
        .update({
          active: true,
          relationship,
          watcher_id: user.id,
          family_member_id: user.id,
        })
        .eq("id", existingLink.id);

      if (reactivateError) {
        console.error("Family link reactivate failed:", reactivateError);
        throw reactivateError;
      }
    } else {
      const { error: linkError } = await supabase.from("family_links").insert({
        patient_id: invite.patient_id,
        family_member_id: user.id,
        watcher_id: user.id,
        relationship,
        active: true,
      });

      console.log("Link insert result:", linkError);

      if (linkError) {
        if (isUniqueFamilyLinkError(linkError)) {
          const { error: reactivateError } = await supabase
            .from("family_links")
            .update({
              active: true,
              relationship,
              watcher_id: user.id,
            })
            .eq("patient_id", invite.patient_id)
            .eq("family_member_id", user.id);

          if (reactivateError) throw reactivateError;
        } else {
          throw linkError;
        }
      }
    }

    const { error: markUsedError } = await supabase
      .from("family_invites")
      .update({ used: true })
      .eq("id", invite.id)
      .eq("used", false);

    if (markUsedError) {
      console.error("Invite mark-used failed:", markUsedError);
    }

    await updateWatcherRoleIfNeeded(supabase, user.id);

    const patientName = await loadPatientName(supabase, invite.patient_id);

    void notifyPatientAboutFamilyConnection(
      supabase,
      invite.patient_id,
      user.id,
    ).catch((notificationError) => {
      console.error("Family connection notification failed", notificationError);
    });

    return Response.json({
      connected: true,
      patientId: invite.patient_id,
      patientName,
      dashboardUrl: "/dashboard",
    });
  } catch (error) {
    console.error("Family connect failed", error);

    if (isMissingFamilyInvitesTableError(error)) {
      return Response.json(
        {
          error:
            "Familienverbindungen sind noch nicht eingerichtet. Bitte family_invites.sql in Supabase ausführen.",
        },
        { status: 503 },
      );
    }

    return Response.json(
      { error: "Verbindung konnte gerade nicht hergestellt werden." },
      { status: 500 },
    );
  }
}

async function findValidInvite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  code: string,
) {
  const { data: invite, error } = await supabase
    .from("family_invites")
    .select("id, patient_id, code, expires_at, used")
    .eq("code", code)
    .maybeSingle<StoredInvite>();

  console.log("Invite found:", invite);
  console.log("Invite lookup error:", error);

  if (error) {
    if (isMissingFamilyInvitesTableError(error)) return null;
    throw error;
  }

  if (!invite || invite.used) {
    return null;
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return null;
  }

  return invite;
}

async function findRecoverableInvite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  code: string,
  watcherId: string,
) {
  const { data: invite, error } = await supabase
    .from("family_invites")
    .select("id, patient_id, code, expires_at, used")
    .eq("code", code)
    .eq("used", true)
    .maybeSingle<StoredInvite>();

  if (error || !invite) {
    return null;
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return null;
  }

  const existingLink = await queryFamilyLinkForPair(
    supabase,
    invite.patient_id,
    watcherId,
  );

  if (!existingLink || existingLink.active !== false) {
    return null;
  }

  return invite;
}

async function loadPatientName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", patientId)
    .maybeSingle<PatientProfile>();

  return (
    profile?.first_name?.trim() ||
    profile?.last_name?.trim() ||
    "Ihrem Angehörigen"
  );
}

async function updateWatcherRoleIfNeeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: string }>();

  if (currentProfile?.role !== "patient") {
    const { error: roleError } = await supabase
      .from("profiles")
      .update({ role: "family_member" })
      .eq("id", userId);

    if (roleError) {
      console.error("Family connect role update failed", roleError);
    }
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

function isMissingFamilyInvitesTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const record = error as PostgrestError;
  const message = `${record.message ?? ""} ${record.details ?? ""}`.toLowerCase();

  return (
    record.code === "42P01" ||
    record.code === "PGRST205" ||
    (message.includes("family_invites") &&
      (message.includes("does not exist") || message.includes("not found")))
  );
}

function isUniqueFamilyLinkError(error: PostgrestError) {
  return error.code === "23505";
}

async function notifyPatientAboutFamilyConnection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string,
  familyMemberId: string,
) {
  const patientEmail = await getUserEmail(supabase, patientId);
  if (!patientEmail) return;

  const patientName = await getProfileFirstName(supabase, patientId);
  const familyMemberName = await getProfileFirstName(supabase, familyMemberId);
  const patientLanguage = await getProfileLanguage(supabase, patientId);

  await sendFamilyConnectionAlert(
    patientEmail,
    patientName,
    familyMemberName,
    patientLanguage,
  );
}
