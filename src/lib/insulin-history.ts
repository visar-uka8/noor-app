import type {
  MealInsulinTimeSlot,
  StoredConfirmation,
} from "@/types/medication";
import { MEAL_INSULIN_TIME_SLOTS } from "@/types/medication";

export type InsulinDayLog = {
  dateKey: string;
  weekdayLabel: string;
  doses: Array<number | null>;
  missing: boolean;
};

const WEEKDAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function buildInsulinHistory(
  confirmations: StoredConfirmation[],
  days = 7,
): InsulinDayLog[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows: InsulinDayLog[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(day.getDate() - offset);

    const dateKey = formatDateKey(day);
    const weekdayLabel = WEEKDAY_LABELS[day.getDay()] ?? "";
    const dayConfirmations = confirmations.filter((confirmation) =>
      isSameLocalDay(confirmation.scheduled_at, day),
    );

    const doses = MEAL_INSULIN_TIME_SLOTS.map((slot) => {
      const match = dayConfirmations.find(
        (confirmation) =>
          confirmation.dose_time === slot && confirmation.confirmed_at,
      );

      return match?.insulin_units ?? null;
    });

    const missing =
      dayConfirmations.length === 0 ||
      doses.every((dose) => dose === null);

    rows.push({
      dateKey,
      weekdayLabel,
      doses,
      missing: missing && offset > 0,
    });
  }

  return rows;
}

export function formatInsulinDayLog(row: InsulinDayLog) {
  if (row.missing) {
    return `${row.weekdayLabel}: Nicht erfasst`;
  }

  const parts = row.doses.map((dose) =>
    dose != null && dose > 0 ? `${dose} IE` : "—",
  );

  return `${row.weekdayLabel}: ${parts.join(" · ")}`;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSameLocalDay(value: string, day: Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
}

export function getMealSlotOrder(slot: MealInsulinTimeSlot) {
  return MEAL_INSULIN_TIME_SLOTS.indexOf(slot);
}
