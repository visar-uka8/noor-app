import {
  getScheduledAtForTime,
  normalizeMedicationTimes,
} from "@/lib/medication-schedule";
import type { StoredConfirmation, StoredMedication } from "@/types/medication";

const STREAK_LOOKBACK_DAYS = 365;

export type MedicationStreakInfo = {
  streak: number;
  milestoneMessage: string | null;
};

export function getStreakMilestoneMessage(streak: number): string | null {
  if (streak >= 100) return "100 Tage! 🎉 Eine Legende.";
  if (streak >= 30) return "Ein Monat! 🏆 Außergewöhnlich.";
  if (streak >= 14) return "Zwei Wochen! 💪 Sie sind unschlagbar.";
  if (streak >= 7) return "Eine Woche! 🌟 Das ist großartig.";
  return null;
}

export function getMedicationStreakInfo(streak: number): MedicationStreakInfo {
  return {
    streak,
    milestoneMessage: getStreakMilestoneMessage(streak),
  };
}

export function formatPatientStreakLabel(
  patientFirstName: string,
  streak: number,
) {
  const label = getStreakCaretakerLabel(patientFirstName);
  const possessive = label === "Papa" ? "seine" : "ihre";
  return `🔥 ${label} hat ${possessive} Medikamente ${streak} Tage in Folge genommen`;
}

function getStreakCaretakerLabel(firstName: string) {
  const normalized = firstName.trim().toLowerCase();
  if (normalized === "hans") return "Papa";
  if (normalized === "renate") return "Mama";
  if (!firstName.trim()) return "Mama";
  return firstName.trim();
}

export function toLocalDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateMedicationStreak(
  medications: StoredMedication[],
  confirmations: StoredConfirmation[],
  now: Date = new Date(),
): number {
  const activeMedications = (medications ?? []).filter((medication) => {
    if (!medication.is_active) return false;
    return normalizeMedicationTimes(medication.times).length > 0;
  });

  if (activeMedications.length === 0) return 0;

  const confirmedKeys = new Set<string>();

  for (const confirmation of confirmations) {
    if (!confirmation.confirmed_at || !confirmation.medication_id) continue;
    const dateKey = toLocalDateKey(confirmation.scheduled_at);
    confirmedKeys.add(
      `${dateKey}:${confirmation.medication_id}:${confirmation.dose_time}`,
    );
  }

  let streak = 0;
  const cursor = startOfLocalDay(now);

  for (let dayOffset = 0; dayOffset < STREAK_LOOKBACK_DAYS; dayOffset += 1) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() - dayOffset);
    const isToday = dayOffset === 0;
    const expected = getExpectedDosesForDay(activeMedications, day, now, isToday);

    if (expected.length === 0) {
      // Nothing due yet today — keep checking previous days.
      if (isToday) continue;
      // No scheduled meds that day — skip without breaking the streak.
      continue;
    }

    const allConfirmed = expected.every((dose) =>
      confirmedKeys.has(`${dose.dateKey}:${dose.medicationId}:${dose.slot}`),
    );

    if (allConfirmed) {
      streak += 1;
      continue;
    }

    // Today incomplete: don't count today, but keep prior consecutive days.
    if (isToday) continue;

    break;
  }

  return streak;
}

function getExpectedDosesForDay(
  medications: StoredMedication[],
  day: Date,
  now: Date,
  isToday: boolean,
) {
  const dateKey = toLocalDateKey(day);
  const dayStart = startOfLocalDay(day);

  const doses = medications.flatMap((medication) => {
    if (
      medication.start_date &&
      toLocalDateKey(medication.start_date) > dateKey
    ) {
      return [];
    }

    return normalizeMedicationTimes(medication.times).map((entry) => {
      const scheduledAt = getScheduledAtForTime(entry.time, dayStart);
      return {
        medicationId: medication.id,
        slot: entry.slot,
        dateKey,
        scheduledAt,
      };
    });
  });

  if (!isToday) return doses;

  // Today: only doses due so far (scheduled time has arrived).
  return doses.filter((dose) => dose.scheduledAt.getTime() <= now.getTime());
}

function startOfLocalDay(value: Date) {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
}
