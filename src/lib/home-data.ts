import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadActiveMedications,
  loadConfirmationsForStreak,
  loadTodayConfirmations,
  syncMissedDoses,
} from "@/lib/medication-data";
import { calculateMedicationStreak } from "@/lib/medication-streak";
import {
  buildDisconnectedFamilyCard,
  buildPatientFamilyCardWithActivity,
  buildHomeHealthPassportSummary,
  buildHomeMedicationSummary,
  formatHomeLabDate,
  getInitials,
  type HomeScreenData,
} from "@/lib/home-screen";
import { loadTodayActivityLogs, loadRecentActivityLogs } from "@/lib/activity-log-data";
import {
  loadHomeWaterSummary,
} from "@/lib/health-goals-data";
import {
  buildHomeActivityWeekSummary,
  buildHomeTodayActivitySummary,
} from "@/types/activity-log";
import {
  buildWatcherFollowText,
  getWatcherId,
} from "@/lib/family-roles";
import {
  queryActivePatientWatchersSafe,
  queryActiveWatcherLinkForUser,
} from "@/lib/family-links-query";
import {
  loadUserProfileRow,
  loadProfileEditRow,
  logSupabaseError,
} from "@/lib/load-settings-profile";
import {
  getProfileHealthCompletionPercent,
  getProfileHealthMissingLabels,
  isProfileHealthIncompleteFromRow,
} from "@/lib/profile-health-completion";
import {
  mergeProfileHealthSources,
  readProfileHealthMetadata,
} from "@/lib/profile-health-metadata";
import { resolveHomeDisplayFields } from "@/lib/profile-display";
import { loadHealthPassportForUser } from "@/lib/health-passport-load";
import { isHealthPassportAvailable } from "@/lib/health-passport-completion";
import { loadVisibleFamilyNoteSafe } from "@/lib/family-notes-data";
import { resolveStoredAvatarUrl } from "@/lib/profile-avatar-store";
import type { StoredConfirmation, StoredMedication } from "@/types/medication";

export type HomeScreenResponse = HomeScreenData;

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

export async function buildHomeScreenResponse(
  user: AuthUser,
  supabase: SupabaseClient,
): Promise<HomeScreenResponse> {
  console.log("Home page user:", {
    id: user.id,
    email: user.email,
    metadata: user.user_metadata,
  });

  const profile = await loadProfileSafe(user, supabase);
  const profileEdit = await loadProfileEditSafe(user.id, supabase);
  const medications = await loadMedicationsSafe(user.id, supabase);
  const confirmations = await loadConfirmationsSafe(user.id, supabase);

  try {
    await syncMissedDoses(user.id, supabase, medications, confirmations);
  } catch (error) {
    console.error("Home medication sync failed:", error);
  }

  const refreshedConfirmations = await loadConfirmationsSafe(
    user.id,
    supabase,
  );
  const streakConfirmations = await loadStreakConfirmationsSafe(
    user.id,
    supabase,
  );
  const medicationStreak = calculateMedicationStreak(
    medications,
    streakConfirmations,
  );

  const labResult = await loadLabResultSafe(user.id, supabase);
  const todayActivityLogs = await loadTodayActivityLogsSafe(user.id, supabase);
  const weekActivityLogs = await loadRecentActivityLogsSafe(user.id, supabase);
  const activityWeek = buildHomeActivityWeekSummary(weekActivityLogs);
  const waterToday = await loadHomeWaterSummarySafe(
    user.id,
    supabase,
    profileEdit?.gender,
  );
  const family = await loadFamilyCardSafe(user.id, supabase, todayActivityLogs);
  const passport = await loadHealthPassportForUser(user.id, supabase);
  const watchedPatientHealthPassportAvailable =
    await loadWatchedPatientPassportAvailable(user.id, supabase);
  const unreadFamilyNote = await loadVisibleFamilyNoteSafe(supabase, user.id);

  const metadata = user.user_metadata as {
    first_name?: string;
    last_name?: string;
  } | null;

  const { firstName, lastName, initials } = resolveHomeDisplayFields({
    profile,
    metadata,
    email: user.email,
  });

  const profileHealthUserMetadata = await loadAuthUserMetadataSafe(
    user.id,
    supabase,
    user.user_metadata,
  );
  const profileHealthMetadata = readProfileHealthMetadata(profileHealthUserMetadata);
  const profileHealth = mergeProfileHealthSources(
    profileEdit,
    profileHealthMetadata,
  );
  const profileHealthIncomplete = isProfileHealthIncompleteFromRow(
    profileEdit,
    profileHealthMetadata,
  );

  const payload: HomeScreenResponse = {
    firstName,
    lastName,
    initials,
    avatarUrl: resolveStoredAvatarUrl({
      profileAvatarUrl: profile?.avatar_url,
      metadata: user.user_metadata as Record<string, unknown> | undefined,
    }),
    medication: buildHomeMedicationSummary(medications, refreshedConfirmations),
    medicationStreak,
    labResult,
    family: {
      ...family,
      watchedPatientHealthPassportAvailable,
    },
    healthPassport: buildHomeHealthPassportSummary(passport),
    todayActivity: buildHomeTodayActivitySummary(todayActivityLogs, activityWeek),
    activityWeek,
    waterToday,
    unreadFamilyNote,
    profileHealthIncomplete,
    profileHealthProgress: profileHealthIncomplete
      ? {
          percent: getProfileHealthCompletionPercent(profileHealth),
          missingLabels: getProfileHealthMissingLabels(profileHealth),
        }
      : null,
  };

  console.log("Home page data:", payload);

  return payload;
}

async function loadAuthUserMetadataSafe(
  userId: string,
  supabase: SupabaseClient,
  fallback: Record<string, unknown> | null | undefined,
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return fallback;
  }

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error || !data.user?.user_metadata) {
      return fallback;
    }

    return data.user.user_metadata as Record<string, unknown>;
  } catch (error) {
    console.error("Home auth metadata load failed:", error);
    return fallback;
  }
}

async function loadProfileSafe(user: AuthUser, supabase: SupabaseClient) {
  console.log("Fetching profile for:", user.id);

  const { profile, error } = await loadUserProfileRow(
    supabase,
    user.id,
    "Home profile load",
  );

  console.log("Profile result:", profile);
  console.log("Profile error:", error);

  if (error) {
    logSupabaseError("Home profile query failed", error);
    return null;
  }

  return profile;
}

async function loadProfileEditSafe(userId: string, supabase: SupabaseClient) {
  const { profile, error } = await loadProfileEditRow(
    supabase,
    userId,
    "Home profile health load",
  );

  if (error) {
    logSupabaseError("Home profile health query failed", error);
  }

  return profile;
}

async function loadMedicationsSafe(
  userId: string,
  supabase: SupabaseClient,
): Promise<StoredMedication[]> {
  try {
    const medications = await loadActiveMedications(userId, supabase);
    console.log("Home page medications data:", medications);
    return medications;
  } catch (error) {
    console.error("Home medications query failed:", error);
    return [];
  }
}

async function loadConfirmationsSafe(
  userId: string,
  supabase: SupabaseClient,
): Promise<StoredConfirmation[]> {
  try {
    const confirmations = await loadTodayConfirmations(userId, supabase);
    console.log("Home page confirmations data:", confirmations);
    return confirmations;
  } catch (error) {
    console.error("Home confirmations query failed:", error);
    return [];
  }
}

async function loadStreakConfirmationsSafe(
  userId: string,
  supabase: SupabaseClient,
): Promise<StoredConfirmation[]> {
  try {
    return await loadConfirmationsForStreak(userId, supabase);
  } catch (error) {
    console.error("Home streak confirmations query failed:", error);
    return [];
  }
}

async function loadLabResultSafe(userId: string, supabase: SupabaseClient) {
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
    console.error("Home lab query failed:", error);
    return { hasResult: false, lastDate: null };
  }

  return {
    hasResult: Boolean(data?.created_at),
    lastDate: formatHomeLabDate(data?.created_at ?? null),
  };
}

async function loadRecentActivityLogsSafe(userId: string, supabase: SupabaseClient) {
  try {
    return await loadRecentActivityLogs(userId, supabase);
  } catch (error) {
    console.error("Home recent activity log query failed:", error);
    return [];
  }
}

async function loadTodayActivityLogsSafe(userId: string, supabase: SupabaseClient) {
  try {
    return await loadTodayActivityLogs(userId, supabase);
  } catch (error) {
    console.error("Home activity log query failed:", error);
    return [];
  }
}

async function loadHomeWaterSummarySafe(
  userId: string,
  supabase: SupabaseClient,
  gender?: string | null,
) {
  try {
    return await loadHomeWaterSummary(supabase, userId, gender);
  } catch (error) {
    console.error("Home water summary query failed:", error);
    return {
      liters: 0,
      goalLiters: gender === "male" ? 2.5 : 2,
    };
  }
}

async function loadFamilyCardSafe(
  userId: string,
  supabase: SupabaseClient,
  todayActivityLogs: Awaited<ReturnType<typeof loadTodayActivityLogs>> = [],
) {
  try {
    const watchers = await loadPatientWatchersSafe(userId, supabase);

    console.log(
      "Home family watchers:",
      watchers.map((watcher) => watcher.watcherFirstName),
    );

    if (watchers.length > 0) {
      return {
        connectedCount: watchers.length,
        card: buildPatientFamilyCardWithActivity({
          watcherCount: watchers.length,
          watcherFirstName: watchers[0]?.watcherFirstName,
          watcherNames: watchers.map((watcher) => watcher.watcherFirstName),
          todayActivity: todayActivityLogs,
        }),
        watchers,
        watcherFollowText: buildWatcherFollowText(watchers),
      };
    }

    return {
      connectedCount: 0,
      card: buildDisconnectedFamilyCard(),
      watchers: [],
      watcherFollowText: "",
    };
  } catch (error) {
    console.error("Home family card query failed:", error);
    return {
      connectedCount: 0,
      card: buildDisconnectedFamilyCard(),
      watchers: [],
      watcherFollowText: "",
    };
  }
}

async function loadPatientWatchersSafe(userId: string, supabase: SupabaseClient) {
  const links = await queryActivePatientWatchersSafe(supabase, userId);
  if (!links.length) return [];

  const watchers: Array<{
    linkId: string;
    watcherId: string;
    watcherFirstName: string;
    watcherName: string;
    watcherInitials: string;
    watcherAvatarUrl?: string | null;
    relationship: string;
  }> = [];

  for (const link of links) {
    const watcherId = getWatcherId(link);
    const { profile, error: profileError } = await loadUserProfileRow(
      supabase,
      watcherId,
      "Home watcher profile load",
    );

    if (profileError) {
      console.error("Home watcher profile query failed:", profileError);
    }

    const firstName = profile?.first_name?.trim() || "Angehörige";
    const lastName = profile?.last_name?.trim() || "";

    watchers.push({
      linkId: link.id,
      watcherId,
      watcherFirstName: firstName,
      watcherName: `${firstName}${lastName ? ` ${lastName}` : ""}`.trim(),
      watcherInitials: getInitials(firstName, lastName) || firstName.slice(0, 2).toUpperCase(),
      watcherAvatarUrl: profile?.avatar_url ?? null,
      relationship: link.relationship,
    });
  }

  return watchers;
}

async function loadWatchedPatientPassportAvailable(
  userId: string,
  supabase: SupabaseClient,
) {
  try {
    const familyLink = await queryActiveWatcherLinkForUser(supabase, userId);
    if (!familyLink) return false;

    const watchedPassport = await loadHealthPassportForUser(
      familyLink.patient_id,
      supabase,
    );

    return isHealthPassportAvailable(watchedPassport);
  } catch (error) {
    console.error("Watched patient passport check failed:", error);
    return false;
  }
}
