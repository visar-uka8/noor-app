import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadActiveMedications,
  loadTodayConfirmations,
  syncMissedDoses,
} from "@/lib/medication-data";
import {
  buildDisconnectedFamilyCard,
  buildFamilyMemberFamilyCard,
  buildHomeMedicationSummary,
  buildPatientFamilyCard,
  formatHomeLabDate,
  getInitials,
  isHealthPassportComplete,
  type HomeScreenData,
} from "@/lib/home-screen";
import { getCaretakerLabel } from "@/lib/family-dashboard-status";
import { resolveProfileNames } from "@/lib/profile-display";
import type { HealthPassportData } from "@/types/health-passport";
import type { StoredConfirmation, StoredMedication } from "@/types/medication";

export type HomeSectionKey =
  | "profile"
  | "medication"
  | "labResult"
  | "family"
  | "healthPassport";

export type HomeScreenResponse = HomeScreenData & {
  sectionErrors?: Partial<Record<HomeSectionKey, string>>;
};

type Profile = {
  first_name: string;
  last_name: string;
};

type StoredPassport = {
  personal: HealthPassportData["personal"];
  medications: HealthPassportData["medications"];
  allergies: HealthPassportData["allergies"];
  surgeries: HealthPassportData["surgeries"];
  emergency_contact: HealthPassportData["emergencyContact"];
};

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

export async function buildHomeScreenResponse(
  user: AuthUser,
  supabase: SupabaseClient,
): Promise<HomeScreenResponse> {
  const sectionErrors: Partial<Record<HomeSectionKey, string>> = {};

  console.log("Home page user:", {
    id: user.id,
    email: user.email,
    metadata: user.user_metadata,
  });

  const profile = await loadProfileSafe(user, supabase, sectionErrors);
  const medications = await loadMedicationsSafe(user.id, supabase, sectionErrors);
  const confirmations = await loadConfirmationsSafe(
    user.id,
    supabase,
    sectionErrors,
  );

  try {
    await syncMissedDoses(user.id, supabase, medications, confirmations);
  } catch (error) {
    console.error("Home medication sync failed:", error);
    sectionErrors.medication ??= formatQueryError(error);
  }

  const refreshedConfirmations = sectionErrors.medication
    ? confirmations
    : await loadConfirmationsSafe(user.id, supabase, sectionErrors, {
        suppressError: true,
      });

  const labResult = await loadLabResultSafe(user.id, supabase, sectionErrors);
  const family = await loadFamilyCardSafe(user.id, supabase, sectionErrors);
  const passport = await loadPassportSafe(user.id, supabase, sectionErrors);

  const { firstName, lastName } = resolveProfileNames(
    profile,
    user.user_metadata as { first_name?: string; last_name?: string },
  );
  const displayFirstName =
    firstName ||
    (user.user_metadata?.first_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Willkommen";

  const payload: HomeScreenResponse = {
    firstName: displayFirstName,
    initials: getInitials(displayFirstName, lastName) || "?",
    medication: buildHomeMedicationSummary(medications, refreshedConfirmations),
    labResult,
    family,
    healthPassport: {
      complete: isHealthPassportComplete(passport),
    },
  };

  if (Object.keys(sectionErrors).length > 0) {
    payload.sectionErrors = sectionErrors;
    console.log("Home page section errors:", sectionErrors);
  }

  console.log("Home page data:", payload);

  return payload;
}

async function loadProfileSafe(
  user: AuthUser,
  supabase: SupabaseClient,
  sectionErrors: Partial<Record<HomeSectionKey, string>>,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  console.log("Home page profile data:", data);
  console.log("Home page profile error:", error);

  if (error) {
    sectionErrors.profile = error.message;
    console.error("Home profile query failed:", error);
    return null;
  }

  return data;
}

async function loadMedicationsSafe(
  userId: string,
  supabase: SupabaseClient,
  sectionErrors: Partial<Record<HomeSectionKey, string>>,
): Promise<StoredMedication[]> {
  try {
    const medications = await loadActiveMedications(userId, supabase);
    console.log("Home page medications data:", medications);
    return medications;
  } catch (error) {
    const message = formatQueryError(error);
    sectionErrors.medication = message;
    console.error("Home medications query failed:", error);
    return [];
  }
}

async function loadConfirmationsSafe(
  userId: string,
  supabase: SupabaseClient,
  sectionErrors: Partial<Record<HomeSectionKey, string>>,
  options?: { suppressError?: boolean },
): Promise<StoredConfirmation[]> {
  try {
    const confirmations = await loadTodayConfirmations(userId, supabase);
    console.log("Home page confirmations data:", confirmations);
    return confirmations;
  } catch (error) {
    console.error("Home confirmations query failed:", error);
    if (!options?.suppressError) {
      sectionErrors.medication ??= formatQueryError(error);
    }
    return [];
  }
}

async function loadLabResultSafe(
  userId: string,
  supabase: SupabaseClient,
  sectionErrors: Partial<Record<HomeSectionKey, string>>,
) {
  const { data, error } = await supabase
    .from("lab_results")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ created_at: string }>();

  console.log("Home page lab data:", data);
  console.log("Home page lab error:", error);

  if (error) {
    sectionErrors.labResult = error.message;
    console.error("Home lab query failed:", error);
    return { hasResult: false, lastDate: null };
  }

  return {
    hasResult: Boolean(data?.created_at),
    lastDate: formatHomeLabDate(data?.created_at ?? null),
  };
}

async function loadFamilyCardSafe(
  userId: string,
  supabase: SupabaseClient,
  sectionErrors: Partial<Record<HomeSectionKey, string>>,
) {
  try {
    const asFamilyMember = await loadFamilyMemberLinkSafe(userId, supabase);

    if (asFamilyMember) {
      const medications = await loadActiveMedications(
        asFamilyMember.patientId,
        supabase,
      );
      const confirmations = await loadTodayConfirmations(
        asFamilyMember.patientId,
        supabase,
      );

      try {
        await syncMissedDoses(
          asFamilyMember.patientId,
          supabase,
          medications,
          confirmations,
        );
      } catch (error) {
        console.error("Home family patient medication sync failed:", error);
      }

      const refreshedConfirmations = await loadTodayConfirmations(
        asFamilyMember.patientId,
        supabase,
      );
      const medicationSummary = buildHomeMedicationSummary(
        medications,
        refreshedConfirmations,
      );

      return {
        connectedCount: 1,
        card: buildFamilyMemberFamilyCard({
          patientLabel: asFamilyMember.patientLabel,
          medication: medicationSummary,
        }),
      };
    }

    const watchers = await loadPatientWatchersSafe(userId, supabase);

    if (watchers.length > 0) {
      return {
        connectedCount: watchers.length,
        card: buildPatientFamilyCard({
          watcherCount: watchers.length,
          watcherFirstName: watchers[0]?.firstName,
        }),
      };
    }

    return {
      connectedCount: 0,
      card: buildDisconnectedFamilyCard(),
    };
  } catch (error) {
    sectionErrors.family = formatQueryError(error);
    console.error("Home family card query failed:", error);
    return {
      connectedCount: 0,
      card: buildDisconnectedFamilyCard(),
    };
  }
}

async function loadFamilyMemberLinkSafe(
  userId: string,
  supabase: SupabaseClient,
) {
  const { data: familyLink, error: linkError } = await supabase
    .from("family_links")
    .select("patient_id")
    .eq("family_member_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ patient_id: string }>();

  if (linkError) throw linkError;
  if (!familyLink) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", familyLink.patient_id)
    .maybeSingle<{ first_name: string | null }>();

  if (profileError) throw profileError;

  const firstName = profile?.first_name?.trim() || "Mama";

  return {
    patientId: familyLink.patient_id,
    patientLabel: getCaretakerLabel(firstName),
  };
}

async function loadPatientWatchersSafe(userId: string, supabase: SupabaseClient) {
  const { data: links, error: linksError } = await supabase
    .from("family_links")
    .select("family_member_id")
    .eq("patient_id", userId)
    .eq("active", true);

  if (linksError) throw linksError;
  if (!links?.length) return [];

  const watchers: Array<{ firstName: string }> = [];

  for (const link of links) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("id", link.family_member_id)
      .maybeSingle<{ first_name: string | null }>();

    if (profileError) throw profileError;

    const firstName = profile?.first_name?.trim();
    if (firstName) watchers.push({ firstName });
  }

  return watchers;
}

async function loadPassportSafe(
  userId: string,
  supabase: SupabaseClient,
  sectionErrors: Partial<Record<HomeSectionKey, string>>,
): Promise<HealthPassportData | null> {
  const { data, error } = await supabase
    .from("health_passports")
    .select("personal, medications, allergies, surgeries, emergency_contact")
    .eq("user_id", userId)
    .maybeSingle<StoredPassport>();

  console.log("Home page passport data:", data ? "loaded" : null);
  console.log("Home page passport error:", error);

  if (error) {
    sectionErrors.healthPassport = error.message;
    console.error("Home passport query failed:", error);
    return null;
  }

  if (!data) return null;

  return {
    userId,
    personal: data.personal,
    medications: data.medications,
    allergies: data.allergies,
    surgeries: data.surgeries,
    emergencyContact: data.emergency_contact,
  };
}

function formatQueryError(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "Unbekannter Datenbankfehler";
}
