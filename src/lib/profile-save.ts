import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { isMissingColumnError, logSupabaseError } from "@/lib/load-settings-profile";
import {
  healthUpdatesToMetadata,
  saveProfileHealthMetadata,
} from "@/lib/profile-health-metadata";

const HEALTH_ONLY_COLUMNS = [
  "gender",
  "height_cm",
  "weight_kg",
  "activity_level",
  "sport_types",
] as const;

export type ProfileSaveUpdates = Record<string, unknown>;

export type ProfileSaveResult =
  | {
      ok: true;
      healthFieldsSaved: boolean;
      warning?: string;
    }
  | {
      ok: false;
      error: unknown;
      message: string;
    };

function stripHealthColumns(updates: ProfileSaveUpdates) {
  const next = { ...updates };

  for (const column of HEALTH_ONLY_COLUMNS) {
    delete next[column];
  }

  return next;
}

function stripColumn(updates: ProfileSaveUpdates, column: string) {
  const next = { ...updates };
  delete next[column];
  return next;
}

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return String(error);
  }

  return String((error as PostgrestError).message ?? error);
}

function isNotNullViolation(error: unknown, column: string) {
  const message = getErrorMessage(error).toLowerCase();
  const code = String((error as PostgrestError).code ?? "");

  return (
    code === "23502" ||
    (message.includes("null value") && message.includes(column))
  );
}

function extractMissingColumn(error: unknown) {
  const message = getErrorMessage(error);
  const quoted = message.match(/'([^']+)' column/i)?.[1];
  if (quoted) return quoted;

  return message.match(/column[s]?\s+"?(\w+)"?\s+of/i)?.[1] ?? null;
}

function hasHealthColumns(updates: ProfileSaveUpdates) {
  return HEALTH_ONLY_COLUMNS.some((column) => column in updates);
}

async function writeProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: ProfileSaveUpdates,
  existing: boolean,
  insertBase: ProfileSaveUpdates,
) {
  if (existing) {
    return supabase.from("profiles").update(updates).eq("id", userId);
  }

  const row = { ...insertBase, ...updates };
  delete row.user_type;

  return supabase.from("profiles").insert(row);
}

export async function saveProfileUpdatesWithFallback(
  supabase: SupabaseClient,
  userId: string,
  updates: ProfileSaveUpdates,
  options: {
    existing: boolean;
    insertBase: ProfileSaveUpdates;
    userMetadata?: Record<string, unknown> | null;
    allowHealthMetadataFallback?: boolean;
  },
): Promise<ProfileSaveResult> {
  let currentUpdates = { ...updates };
  let insertBase = { ...options.insertBase };
  let healthFieldsSaved = hasHealthColumns(currentUpdates);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await writeProfile(
      supabase,
      userId,
      currentUpdates,
      options.existing,
      insertBase,
    );

    if (!error) {
      if (!healthFieldsSaved && hasHealthColumns(updates)) {
        if (options.allowHealthMetadataFallback) {
          const healthMetadata = healthUpdatesToMetadata(updates);

          if (healthMetadata) {
            try {
              await saveProfileHealthMetadata(
                supabase,
                userId,
                healthMetadata,
                options.userMetadata,
              );

              return { ok: true, healthFieldsSaved: true };
            } catch (metadataError) {
              logSupabaseError("Profile health metadata save", metadataError);
            }
          }
        }

        return {
          ok: true,
          healthFieldsSaved: false,
          warning:
            "Name wurde gespeichert. Gesundheitsangaben konnten noch nicht gespeichert werden.",
        };
      }

      return { ok: true, healthFieldsSaved };
    }

    logSupabaseError(`Profile save attempt ${attempt + 1}`, error);

    if (!options.existing && isNotNullViolation(error, "role")) {
      insertBase = {
        ...insertBase,
        role: insertBase.role ?? "patient",
      };
      continue;
    }

    if (isMissingColumnError(error)) {
      const strippedHealth = stripHealthColumns(currentUpdates);

      if (JSON.stringify(strippedHealth) !== JSON.stringify(currentUpdates)) {
        currentUpdates = strippedHealth;
        healthFieldsSaved = false;
        continue;
      }

      const missingColumn = extractMissingColumn(error);

      if (
        missingColumn &&
        (missingColumn in currentUpdates || missingColumn in insertBase)
      ) {
        if (
          HEALTH_ONLY_COLUMNS.includes(
            missingColumn as (typeof HEALTH_ONLY_COLUMNS)[number],
          )
        ) {
          healthFieldsSaved = false;
        }

        currentUpdates = stripColumn(currentUpdates, missingColumn);
        insertBase = stripColumn(insertBase, missingColumn);
        continue;
      }
    }

    const message = getErrorMessage(error);

    if (message.toLowerCase().includes("permission denied")) {
      return {
        ok: false,
        error,
        message: "Keine Berechtigung zum Speichern. Bitte melden Sie sich erneut an.",
      };
    }

    return {
      ok: false,
      error,
      message,
    };
  }

  return {
    ok: false,
    error: new Error("Profile save retry limit reached."),
    message: "Profil konnte nach mehreren Versuchen nicht gespeichert werden.",
  };
}
