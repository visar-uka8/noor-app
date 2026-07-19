import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  queryHealthPassportRow,
} from "@/lib/health-passport-db";
import { normalizeStoredConditions } from "@/lib/health-passport-load";
import { toPassportMedications } from "@/lib/health-passport-medications";
import { buildShareUrl } from "@/lib/health-passport-share";
import { loadActiveMedications } from "@/lib/medication-data";
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
  vaccinations?: HealthPassportData["vaccinations"];
  conditions?: HealthPassportData["conditions"];
  surgeries: HealthPassportData["surgeries"];
  emergency_contact: HealthPassportData["emergencyContact"];
};

export type SharedPassportResult =
  | { error: string; code: "invalid" | "expired" | "missing" | "unavailable" }
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
    return {
      error: "Notfall-Link ist lokal noch nicht verfügbar.",
      code: "unavailable",
    };
  }

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return {
      error: "Dieser Link ist nicht mehr gültig",
      code: "invalid",
    };
  }

  const { data: share, error: shareError } = await supabase
    .from("health_passport_shares")
    .select("id, patient_id, token, expires_at, viewed_at")
    .eq("token", normalizedToken)
    .maybeSingle<StoredShare>();

  if (shareError) throw shareError;

  if (!share) {
    return {
      error: "Dieser Link ist nicht mehr gültig",
      code: "invalid",
    };
  }

  if (new Date(share.expires_at).getTime() < Date.now()) {
    return {
      error: "Dieser Link ist nicht mehr gültig",
      code: "expired",
    };
  }

  const { data: passport, vaccinationsSupported, conditionsSupported } =
    await queryHealthPassportRow<StoredPassport>(supabase, share.patient_id);

  if (!passport) {
    return {
      error: "Gesundheitspass nicht gefunden.",
      code: "missing",
    };
  }

  let medications = passport.medications;
  try {
    const activeMedications = await loadActiveMedications(
      share.patient_id,
      supabase,
    );
    medications = toPassportMedications(activeMedications);
  } catch (error) {
    console.error("Shared passport medication sync failed:", error);
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
      medications,
      allergies: passport.allergies,
      conditions:
        conditionsSupported && "conditions" in passport
          ? normalizeStoredConditions(passport.conditions)
          : [],
      vaccinations:
        vaccinationsSupported && "vaccinations" in passport
          ? (passport.vaccinations ?? [])
          : [],
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
