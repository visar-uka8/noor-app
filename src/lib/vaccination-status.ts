import type { HealthPassportData, PassportVaccination } from "@/types/health-passport";

export type VaccinationDueStatus = "none" | "ok" | "soon" | "overdue";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getVaccinationDueStatus(nextDue: string): VaccinationDueStatus {
  if (!nextDue.trim()) return "none";

  const dueDate = parseDateOnly(nextDue);
  if (!dueDate) return "none";

  const today = startOfDay(new Date());
  const due = startOfDay(dueDate);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / MS_PER_DAY);

  if (diffDays < 0) return "overdue";
  if (diffDays <= 30) return "soon";
  return "ok";
}

export function passportHasOverdueVaccination(
  passport: HealthPassportData | null | undefined,
) {
  if (!passport) return false;

  return passport.vaccinations.some(
    (vaccination) =>
      vaccination.name.trim().length > 0 &&
      getVaccinationDueStatus(vaccination.next_due) === "overdue",
  );
}

export function formatVaccinationDate(date: string) {
  if (!date.trim()) return "";

  const parsed = parseDateOnly(date);
  if (!parsed) return date;

  return parsed.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatVaccinationMonthYear(date: string) {
  if (!date.trim()) return "";

  const parsed = parseDateOnly(date);
  if (!parsed) return date;

  return parsed.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
}

export function formatEmergencyVaccinationLine(vaccination: PassportVaccination) {
  const name = vaccination.name.trim();
  const dateLabel = formatVaccinationMonthYear(vaccination.date);

  if (!name) return "";
  if (!dateLabel) return name;

  return `${name} — ${dateLabel}`;
}

export function formatVaccinationSummaryLine(vaccination: PassportVaccination) {
  const name = vaccination.name.trim();
  const dateLabel = formatVaccinationDate(vaccination.date);

  if (!name || !dateLabel) return null;

  return `💉 ${name} — ${dateLabel}`;
}

export function formatVaccinationNextDueLine(vaccination: PassportVaccination) {
  if (!vaccination.next_due.trim()) return null;

  const dueStatus = getVaccinationDueStatus(vaccination.next_due);
  const label = formatVaccinationMonthYear(vaccination.next_due);

  if (!label) return null;

  if (dueStatus === "overdue" || dueStatus === "soon") {
    return `Nächste Auffrischung: ${label} ⚠️`;
  }

  return `Nächste Auffrischung: ${label}`;
}

function parseDateOnly(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
