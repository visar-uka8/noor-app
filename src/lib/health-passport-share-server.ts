import { createClient as createAdminClient } from "@supabase/supabase-js";
import { buildShareUrl } from "@/lib/health-passport-share";
import type { HealthPassportData } from "@/types/health-passport";

type StoredShare = {
  id: string;
  patient_id: string;
  token: string;
  expires_at: string;
  viewed_at: string | null;
};

type StoredPassport = {
  user_id: string;
  personal: HealthPassportData["personal"];
  medications: HealthPassportData["medications"];
  allergies: HealthPassportData["allergies"];
  surgeries: HealthPassportData["surgeries"];
  emergency_contact: HealthPassportData["emergencyContact"];
};

export type SharedPassportResult =
  | { error: string }
  | {
      passport: HealthPassportData;
      share: {
        token: string;
        expiresAt: string;
        shareUrl: string;
      };
    };

export async function getSharedPassportByToken(
  token: string,
): Promise<SharedPassportResult> {
  const supabase = createSupabaseDataClient();

  if (!supabase) {
    return { error: "Notfall-Link ist lokal noch nicht verfügbar." as const };
  }

  const { data: share, error: shareError } = await supabase
    .from("health_passport_shares")
    .select("id, patient_id, token, expires_at, viewed_at")
    .eq("token", token)
    .maybeSingle<StoredShare>();

  if (shareError) throw shareError;

  if (!share) {
    return { error: "Dieser Notfall-Link ist ungültig." as const };
  }

  if (new Date(share.expires_at).getTime() < Date.now()) {
    return { error: "Dieser Notfall-Link ist abgelaufen." as const };
  }

  const { data: passport, error: passportError } = await supabase
    .from("health_passports")
    .select("user_id, personal, medications, allergies, surgeries, emergency_contact")
    .eq("user_id", share.patient_id)
    .maybeSingle<StoredPassport>();

  if (passportError) throw passportError;

  if (!passport) {
    return { error: "Gesundheitspass nicht gefunden." as const };
  }

  if (!share.viewed_at) {
    await supabase
      .from("health_passport_shares")
      .update({ viewed_at: new Date().toISOString() })
      .eq("id", share.id);
  }

  return {
    passport: {
      userId: passport.user_id,
      personal: passport.personal,
      medications: passport.medications,
      allergies: passport.allergies,
      surgeries: passport.surgeries,
      emergencyContact: passport.emergency_contact,
    } satisfies HealthPassportData,
    share: {
      token: share.token,
      expiresAt: share.expires_at,
      shareUrl: buildShareUrl(share.token),
    },
  };
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
