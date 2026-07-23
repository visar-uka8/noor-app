export type AppointmentStatus = "upcoming" | "completed" | "cancelled";

export type AppointmentRecord = {
  id: string;
  user_id: string;
  doctor_name: string;
  scheduled_at: string;
  reason: string | null;
  notes: string | null;
  status: AppointmentStatus;
  reminder_sent_at: string | null;
  preparation_text: string | null;
  preparation_notes: string | null;
  created_at: string;
};

export type AppointmentCreateInput = {
  doctor_name: string;
  scheduled_at: string;
  reason?: string | null;
};

export type AppointmentUpdateInput = {
  doctor_name?: string;
  scheduled_at?: string;
  reason?: string | null;
  notes?: string | null;
  preparation_notes?: string | null;
  status?: AppointmentStatus;
};

/** @deprecated Demo booking flow — use authenticated user id instead. */
export const demoPatientId = "hans-leka-demo";

/** @deprecated Legacy doctor search booking payload. */
export type AppointmentPayload = {
  patient_id: string;
  doctor_name: string;
  doctor_specialization: string;
  scheduled_at: string;
  consultation_type: "Video";
  fee: number;
  reason: string | null;
  status: "confirmed";
};

export function normalizeAppointmentStatus(
  value: string | null | undefined,
): AppointmentStatus {
  if (value === "completed" || value === "cancelled") {
    return value;
  }
  return "upcoming";
}

export function formatAppointmentDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatAppointmentDateShort(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function isAppointmentPast(scheduledAt: string) {
  return new Date(scheduledAt).getTime() < Date.now();
}

export function appointmentNeedsNotes(appointment: AppointmentRecord) {
  return (
    isAppointmentPast(appointment.scheduled_at) &&
    !appointment.notes?.trim() &&
    appointment.status !== "cancelled"
  );
}

export function buildDoctolibSearchUrl(doctorName: string) {
  const query = doctorName.trim() || "Arzt";
  return `https://www.doctolib.de/search?search=${encodeURIComponent(query)}`;
}
