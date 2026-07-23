import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeAppointmentStatus,
  type AppointmentCreateInput,
  type AppointmentRecord,
  type AppointmentUpdateInput,
} from "@/types/appointments";

const FULL_COLUMNS =
  "id, user_id, doctor_name, scheduled_at, reason, notes, status, reminder_sent_at, preparation_text, preparation_notes, created_at";

const LEGACY_BASE_COLUMNS =
  "id, patient_id, doctor_name, scheduled_at, reason, status, created_at";

const LEGACY_EXTENDED_COLUMNS =
  "id, patient_id, doctor_name, scheduled_at, reason, status, notes, preparation_text, preparation_notes, created_at";

type ColumnQuery = {
  columns: string;
  userColumn: "user_id" | "patient_id";
};

const LIST_QUERY_ATTEMPTS: ColumnQuery[] = [
  { columns: FULL_COLUMNS, userColumn: "user_id" },
  { columns: FULL_COLUMNS, userColumn: "patient_id" },
  { columns: LEGACY_EXTENDED_COLUMNS, userColumn: "patient_id" },
  { columns: LEGACY_BASE_COLUMNS, userColumn: "patient_id" },
];

type AppointmentRow = {
  id: string;
  user_id?: string | null;
  patient_id?: string | null;
  doctor_name: string;
  scheduled_at: string;
  reason: string | null;
  notes?: string | null;
  status: string;
  reminder_sent_at?: string | null;
  preparation_text?: string | null;
  preparation_notes?: string | null;
  created_at: string;
};

function isMissingColumnError(error: PostgrestError) {
  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();

  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    message.includes("does not exist") ||
    message.includes("column") ||
    message.includes("schema cache")
  );
}

function isMissingTableError(error: PostgrestError) {
  const message = error.message.toLowerCase();

  if (message.includes("column")) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (message.includes("relation") &&
      message.includes("appointments") &&
      message.includes("does not exist"))
  );
}

export function formatAppointmentsSetupError(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const pgError = error as PostgrestError;

    if (isMissingColumnError(pgError)) {
      const message = `${pgError.message ?? ""} ${pgError.details ?? ""}`.toLowerCase();
      if (message.includes("preparation_notes")) {
        return "Fragen & Notizen benötigen ein DB-Update. Bitte migration_appointments_preparation_notes.sql in Supabase ausführen.";
      }
      return "Arzttermine sind noch nicht eingerichtet. Bitte migration_appointments_tracker.sql in Supabase ausführen.";
    }

    if (isMissingTableError(pgError)) {
      return "Die Termin-Tabelle fehlt. Bitte migration_appointments_tracker.sql in Supabase ausführen.";
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Termine konnten nicht geladen werden.";
}

function mapAppointment(row: AppointmentRow): AppointmentRecord {
  const userId = row.user_id ?? row.patient_id ?? "";

  return {
    id: row.id,
    user_id: userId,
    doctor_name: row.doctor_name,
    scheduled_at: row.scheduled_at,
    reason: row.reason,
    notes: row.notes ?? null,
    status: normalizeAppointmentStatus(row.status),
    reminder_sent_at: row.reminder_sent_at ?? null,
    preparation_text: row.preparation_text ?? null,
    preparation_notes: row.preparation_notes ?? null,
    created_at: row.created_at,
  };
}

async function listWithColumns(
  supabase: SupabaseClient,
  userId: string,
  columns: string,
  userColumn: "user_id" | "patient_id",
) {
  const { data, error } = await supabase
    .from("appointments")
    .select(columns)
    .eq(userColumn, userId)
    .neq("status", "cancelled")
    .order("scheduled_at", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as AppointmentRow[];
  return rows.map(mapAppointment);
}

function columnQueryScore(columns: string) {
  if (columns === FULL_COLUMNS) return 3;
  if (columns === LEGACY_EXTENDED_COLUMNS) return 2;
  return 1;
}

async function enrichAppointmentsWithPreparationNotes(
  supabase: SupabaseClient,
  appointments: AppointmentRecord[],
) {
  if (appointments.length === 0) {
    return appointments;
  }

  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("id, preparation_notes")
      .in(
        "id",
        appointments.map((appointment) => appointment.id),
      );

    if (error) {
      if (isMissingColumnError(error)) {
        return appointments;
      }

      throw error;
    }

    const notesById = new Map(
      (data ?? []).map((row) => [
        row.id as string,
        (row.preparation_notes as string | null | undefined) ?? null,
      ]),
    );

    return appointments.map((appointment) => ({
      ...appointment,
      preparation_notes:
        notesById.get(appointment.id) ?? appointment.preparation_notes,
    }));
  } catch {
    return appointments;
  }
}

async function readPreparationNotesForAppointment(
  supabase: SupabaseClient,
  appointmentId: string,
) {
  const { data, error } = await supabase
    .from("appointments")
    .select("preparation_notes")
    .eq("id", appointmentId)
    .maybeSingle<{ preparation_notes?: string | null }>();

  if (error) {
    throw error;
  }

  return data?.preparation_notes ?? null;
}

function buildAppointmentUpdatePayload(updates: AppointmentUpdateInput) {
  const payload: Record<string, string | null> = {};

  if (updates.doctor_name !== undefined) {
    payload.doctor_name = updates.doctor_name.trim();
  }
  if (updates.scheduled_at !== undefined) {
    payload.scheduled_at = updates.scheduled_at;
  }
  if (updates.reason !== undefined) {
    payload.reason = updates.reason?.trim() || null;
  }
  if (updates.notes !== undefined) {
    payload.notes = updates.notes?.trim() || null;
  }
  if (updates.preparation_notes !== undefined) {
    payload.preparation_notes = updates.preparation_notes?.trim() || null;
  }
  if (updates.status !== undefined) {
    payload.status = updates.status;
  }

  return payload;
}

export async function listAppointmentsForUser(
  supabase: SupabaseClient,
  userId: string,
) {
  let bestRows: AppointmentRecord[] = [];
  let bestScore = 0;

  for (const { columns, userColumn } of LIST_QUERY_ATTEMPTS) {
    try {
      const rows = await listWithColumns(supabase, userId, columns, userColumn);
      const score = columnQueryScore(columns);

      if (score > bestScore || (score === bestScore && rows.length > bestRows.length)) {
        bestRows = rows;
        bestScore = score;
      }
    } catch (error) {
      const pgError = error as PostgrestError;

      if (!isMissingColumnError(pgError)) {
        throw error;
      }
    }
  }

  return enrichAppointmentsWithPreparationNotes(supabase, bestRows);
}

async function getAppointmentWithColumns(
  supabase: SupabaseClient,
  userId: string,
  appointmentId: string,
  columns: string,
  userColumn: "user_id" | "patient_id",
) {
  const { data, error } = await supabase
    .from("appointments")
    .select(columns)
    .eq("id", appointmentId)
    .eq(userColumn, userId)
    .neq("status", "cancelled")
    .maybeSingle<AppointmentRow>();

  if (error) {
    throw error;
  }

  return data ? mapAppointment(data) : null;
}

export async function getAppointmentForUser(
  supabase: SupabaseClient,
  userId: string,
  appointmentId: string,
) {
  const getAttempts: ColumnQuery[] = [
    { columns: FULL_COLUMNS, userColumn: "user_id" },
    { columns: FULL_COLUMNS, userColumn: "patient_id" },
    { columns: LEGACY_EXTENDED_COLUMNS, userColumn: "patient_id" },
    { columns: LEGACY_BASE_COLUMNS, userColumn: "patient_id" },
  ];

  let bestAppointment: AppointmentRecord | null = null;
  let bestScore = 0;

  for (const { columns, userColumn } of getAttempts) {
    try {
      const appointment = await getAppointmentWithColumns(
        supabase,
        userId,
        appointmentId,
        columns,
        userColumn,
      );

      if (!appointment) {
        continue;
      }

      const score = columnQueryScore(columns);
      if (score > bestScore) {
        bestAppointment = appointment;
        bestScore = score;
      }
    } catch (error) {
      const pgError = error as PostgrestError;

      if (!isMissingColumnError(pgError)) {
        throw error;
      }
    }
  }

  return bestAppointment
    ? (await enrichAppointmentsWithPreparationNotes(supabase, [bestAppointment]))[0] ??
        null
    : null;
}

async function findAppointmentForUser(
  supabase: SupabaseClient,
  userId: string,
  appointmentId: string,
) {
  const appointment = await getAppointmentForUser(supabase, userId, appointmentId);
  if (appointment) {
    return appointment;
  }

  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(LEGACY_EXTENDED_COLUMNS)
      .eq("id", appointmentId)
      .neq("status", "cancelled")
      .maybeSingle<AppointmentRow>();

    if (error || !data) {
      return null;
    }

    const ownerMatches =
      data.user_id === userId ||
      data.patient_id === userId ||
      data.patient_id === userId.toString();

    if (!ownerMatches) {
      return null;
    }

    return (
      (await enrichAppointmentsWithPreparationNotes(supabase, [
        mapAppointment(data),
      ]))[0] ?? null
    );
  } catch (error) {
    if (isMissingColumnError(error as PostgrestError)) {
      try {
        const { data, error: legacyError } = await supabase
          .from("appointments")
          .select(LEGACY_BASE_COLUMNS)
          .eq("id", appointmentId)
          .neq("status", "cancelled")
          .maybeSingle<AppointmentRow>();

        if (legacyError || !data || data.patient_id !== userId) {
          return null;
        }

        return (
          (await enrichAppointmentsWithPreparationNotes(supabase, [
            mapAppointment(data),
          ]))[0] ?? null
        );
      } catch {
        return null;
      }
    }

    throw error;
  }
}

export function getNextUpcomingAppointment(appointments: AppointmentRecord[]) {
  const now = Date.now();

  return (
    appointments.find(
      (appointment) =>
        appointment.status === "upcoming" &&
        new Date(appointment.scheduled_at).getTime() >= now,
    ) ?? null
  );
}

export async function createAppointmentForUser(
  supabase: SupabaseClient,
  userId: string,
  input: AppointmentCreateInput,
) {
  const fullInsert = {
    user_id: userId,
    patient_id: userId,
    doctor_name: input.doctor_name.trim(),
    doctor_specialization: "",
    scheduled_at: input.scheduled_at,
    consultation_type: "Praxis",
    fee: 0,
    reason: input.reason?.trim() || null,
    status: "upcoming",
  };

  const fullResult = await supabase
    .from("appointments")
    .insert(fullInsert)
    .select(FULL_COLUMNS)
    .single<AppointmentRow>();

  if (!fullResult.error) {
    return mapAppointment(fullResult.data);
  }

  if (!isMissingColumnError(fullResult.error)) {
    throw fullResult.error;
  }

  const legacyResult = await supabase
    .from("appointments")
    .insert({
      patient_id: userId,
      doctor_name: input.doctor_name.trim(),
      doctor_specialization: "Allgemeinmedizin",
      scheduled_at: input.scheduled_at,
      consultation_type: "Video",
      fee: 0,
      reason: input.reason?.trim() || null,
      status: "confirmed",
    })
    .select(LEGACY_BASE_COLUMNS)
    .single<AppointmentRow>();

  if (legacyResult.error) {
    throw legacyResult.error;
  }

  return mapAppointment(legacyResult.data);
}

async function updateAppointmentRow(
  supabase: SupabaseClient,
  appointmentId: string,
  payload: Record<string, string | null>,
) {
  return supabase
    .from("appointments")
    .update(payload)
    .eq("id", appointmentId)
    .select("id")
    .maybeSingle<{ id: string }>();
}

export async function updateAppointmentForUser(
  supabase: SupabaseClient,
  userId: string,
  appointmentId: string,
  updates: AppointmentUpdateInput,
) {
  const existing = await findAppointmentForUser(supabase, userId, appointmentId);
  if (!existing) {
    throw new Error("Termin nicht gefunden.");
  }

  const payload = buildAppointmentUpdatePayload(updates);
  const { data: updatedRow, error: updateError } = await updateAppointmentRow(
    supabase,
    appointmentId,
    payload,
  );

  if (updateError) {
    throw updateError;
  }

  if (!updatedRow) {
    throw new Error("Termin nicht gefunden.");
  }

  let refreshed = await findAppointmentForUser(supabase, userId, appointmentId);
  if (!refreshed) {
    throw new Error("Termin nicht gefunden.");
  }

  if (updates.preparation_notes !== undefined) {
    const expected = updates.preparation_notes?.trim() || null;

    try {
      const savedNotes = await readPreparationNotesForAppointment(
        supabase,
        appointmentId,
      );

      if (savedNotes !== expected) {
        throw new Error("Fragen & Notizen konnten nicht gespeichert werden.");
      }

      refreshed = {
        ...refreshed,
        preparation_notes: savedNotes,
      };
    } catch (error) {
      if (isMissingColumnError(error as PostgrestError)) {
        throw error;
      }

      throw error;
    }
  }

  return refreshed;
}

export async function deleteAppointmentForUser(
  supabase: SupabaseClient,
  userId: string,
  appointmentId: string,
) {
  const cancelled = { status: "cancelled" };

  const byUser = await supabase
    .from("appointments")
    .update(cancelled)
    .eq("user_id", userId)
    .eq("id", appointmentId);

  if (!byUser.error) {
    return;
  }

  if (!isMissingColumnError(byUser.error)) {
    throw byUser.error;
  }

  const byPatient = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("patient_id", userId)
    .eq("id", appointmentId);

  if (byPatient.error) {
    throw byPatient.error;
  }
}

export async function saveAppointmentPreparation(
  supabase: SupabaseClient,
  appointmentId: string,
  preparationText: string,
) {
  const { error } = await supabase
    .from("appointments")
    .update({ preparation_text: preparationText })
    .eq("id", appointmentId);

  if (error && !isMissingColumnError(error)) {
    throw error;
  }
}

export async function markAppointmentReminderSent(
  supabase: SupabaseClient,
  appointmentId: string,
) {
  const { error } = await supabase
    .from("appointments")
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq("id", appointmentId);

  if (error && !isMissingColumnError(error)) {
    throw error;
  }
}

export async function listAppointmentsNeedingReminder(
  supabase: SupabaseClient,
) {
  const now = Date.now();
  const windowStart = new Date(now + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now + 25 * 60 * 60 * 1000);

  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(FULL_COLUMNS)
      .eq("status", "upcoming")
      .is("reminder_sent_at", null)
      .gte("scheduled_at", windowStart.toISOString())
      .lte("scheduled_at", windowEnd.toISOString());

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as AppointmentRow[];
  return rows.map(mapAppointment);
  } catch {
    return [];
  }
}
