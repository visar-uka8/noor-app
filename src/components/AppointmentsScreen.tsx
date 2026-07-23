"use client";

import {
  CalendarPlus,
  Loader2,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorState, PageSkeleton } from "@/components/AppStates";
import { DoctolibIcon } from "@/components/DoctolibIcon";
import {
  appointmentNeedsNotes,
  buildDoctolibSearchUrl,
  formatAppointmentDateTime,
  isAppointmentPast,
  type AppointmentRecord,
} from "@/types/appointments";

const inputClassName =
  "min-h-12 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary";

const prepNotesInputClassName =
  "min-h-28 w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none focus:border-primary";

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Unerwartete Server-Antwort. Bitte später erneut versuchen.");
  }
}

function appointmentsLoadError(response: Response, payload: { error?: string }) {
  if (response.status === 405) {
    return "Arzttermine sind auf dem Server noch nicht aktiviert. Bitte kurz warten und erneut versuchen.";
  }

  return payload.error ?? "Termine konnten nicht geladen werden.";
}

const doctolibButtonClassName =
  "flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-body font-semibold text-sky-900 transition-colors hover:border-sky-300 hover:bg-sky-100";

const manualEntryButtonClassName =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-body font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-background";

export function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [reason, setReason] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [preparationById, setPreparationById] = useState<Record<string, string>>(
    {},
  );
  const [loadingPreparationId, setLoadingPreparationId] = useState<string | null>(
    null,
  );
  const [notesDraftById, setNotesDraftById] = useState<Record<string, string>>({});
  const [prepNotesDraftById, setPrepNotesDraftById] = useState<
    Record<string, string>
  >({});
  const [savedPrepNotesId, setSavedPrepNotesId] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);
    setLoadErrorMessage(null);

    try {
      const response = await fetch("/api/appointments", {
        credentials: "include",
      });
      const payload = await readJsonResponse<{
        appointments?: AppointmentRecord[];
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(appointmentsLoadError(response, payload));
      }

      setAppointments(payload.appointments ?? []);
    } catch (error) {
      console.error("Appointments load failed", error);
      setLoadErrorMessage(
        error instanceof Error
          ? error.message
          : "Termine konnten nicht geladen werden.",
      );
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const upcoming = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          appointment.status === "upcoming" &&
          !isAppointmentPast(appointment.scheduled_at),
      ),
    [appointments],
  );

  const past = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          appointment.status === "completed" ||
          isAppointmentPast(appointment.scheduled_at),
      ),
    [appointments],
  );

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const scheduledAt = new Date(`${appointmentDate}T${appointmentTime}:00`);
      if (Number.isNaN(scheduledAt.getTime())) {
        throw new Error("Bitte gültiges Datum und Uhrzeit wählen.");
      }

      const response = await fetch("/api/appointments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_name: doctorName,
          scheduled_at: scheduledAt.toISOString(),
          reason,
        }),
      });

      const payload = (await response.json()) as {
        appointment?: AppointmentRecord;
        error?: string;
      };

      if (!response.ok || !payload.appointment) {
        throw new Error(payload.error ?? "Termin konnte nicht gespeichert werden.");
      }

      setAppointments((current) =>
        [...current, payload.appointment!].sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() -
            new Date(b.scheduled_at).getTime(),
        ),
      );
      setDoctorName("");
      setAppointmentDate("");
      setAppointmentTime("");
      setReason("");
      setShowForm(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Termin konnte nicht gespeichert werden.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function fetchPreparation(appointment: AppointmentRecord) {
    if (preparationById[appointment.id] || appointment.preparation_text) {
      return;
    }

    setLoadingPreparationId(appointment.id);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        credentials: "include",
      });
      const payload = await readJsonResponse<{
        preparation?: string;
        error?: string;
      }>(response);

      if (!response.ok || !payload.preparation) {
        throw new Error(payload.error ?? "Vorbereitung konnte nicht geladen werden.");
      }

      setPreparationById((current) => ({
        ...current,
        [appointment.id]: payload.preparation!,
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Vorbereitung konnte nicht geladen werden.",
      );
    } finally {
      setLoadingPreparationId(null);
    }
  }

  function collapsePreparation() {
    setExpandedId(null);
  }

  function expandPreparation(appointment: AppointmentRecord) {
    setExpandedId(appointment.id);
    void fetchPreparation(appointment);
  }

  async function savePreparationNotes(appointmentId: string) {
    const appointment = appointments.find((item) => item.id === appointmentId);
    const preparationNotes =
      prepNotesDraftById[appointmentId] ?? appointment?.preparation_notes ?? "";

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preparation_notes: preparationNotes }),
      });
      const payload = await readJsonResponse<{
        appointment?: AppointmentRecord;
        error?: string;
      }>(response);

      if (!response.ok || !payload.appointment) {
        throw new Error(
          payload.error ?? "Fragen & Notizen konnten nicht gespeichert werden.",
        );
      }

      const savedNotes = payload.appointment.preparation_notes ?? null;
      const expectedNotes = preparationNotes.trim() || null;

      if (savedNotes !== expectedNotes) {
        throw new Error("Fragen & Notizen konnten nicht gespeichert werden.");
      }

      setAppointments((current) =>
        current.map((item) =>
          item.id === appointmentId ? payload.appointment! : item,
        ),
      );
      setPrepNotesDraftById((current) => ({
        ...current,
        [appointmentId]: savedNotes ?? "",
      }));
      setSavedPrepNotesId(appointmentId);
      window.setTimeout(() => {
        setSavedPrepNotesId((current) =>
          current === appointmentId ? null : current,
        );
      }, 2500);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Fragen & Notizen konnten nicht gespeichert werden.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveNotes(appointmentId: string) {
    const notes = notesDraftById[appointmentId]?.trim();
    if (!notes) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, status: "completed" }),
      });
      const payload = (await response.json()) as {
        appointment?: AppointmentRecord;
        error?: string;
      };

      if (!response.ok || !payload.appointment) {
        throw new Error(payload.error ?? "Notizen konnten nicht gespeichert werden.");
      }

      setAppointments((current) =>
        current.map((item) =>
          item.id === appointmentId ? payload.appointment! : item,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Notizen konnten nicht gespeichert werden.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelAppointment(appointmentId: string) {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Termin konnte nicht gelöscht werden.");
      }

      setAppointments((current) =>
        current.filter((appointment) => appointment.id !== appointmentId),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Termin konnte nicht gelöscht werden.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (loadFailed) {
    return (
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
        <ErrorState
          message={
            loadErrorMessage ??
            "Termine konnten nicht geladen werden. Bitte migration_appointments_tracker.sql in Supabase ausführen oder später erneut versuchen."
          }
          onRetry={() => void loadAppointments()}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-4 px-5 py-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Arzttermine</h2>
        <p className="text-body mt-2 text-muted">
          Auf Doctolib buchen, Termin hier eintragen — Erinnerung und
          Vorbereitung aus Ihren Laborwerten inklusive.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-2xl border border-warning/30 bg-warning-light px-4 py-3 text-sm text-warning">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <a
          href={buildDoctolibSearchUrl("")}
          target="_blank"
          rel="noopener noreferrer"
          className={doctolibButtonClassName}
        >
          <DoctolibIcon className="h-5 w-5 shrink-0 rounded-[5px]" />
          Auf Doctolib buchen
        </a>
        <p className="px-1 text-center text-sm text-muted">
          Gebucht? Tragen Sie den Termin hier ein, damit wir Sie erinnern.
        </p>
        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className={manualEntryButtonClassName}
        >
          <CalendarPlus size={20} aria-hidden="true" />
          {showForm ? "Formular schließen" : "Termin in Noor eintragen"}
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleCreate} className="noor-card space-y-4 p-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-foreground">
              Arzt / Ärztin
            </span>
            <input
              className={inputClassName}
              value={doctorName}
              onChange={(event) => setDoctorName(event.target.value)}
              placeholder="Dr. Müller"
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-foreground">
                Datum
              </span>
              <input
                type="date"
                className={inputClassName}
                value={appointmentDate}
                onChange={(event) => setAppointmentDate(event.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-foreground">
                Uhrzeit
              </span>
              <input
                type="time"
                className={inputClassName}
                value={appointmentTime}
                onChange={(event) => setAppointmentTime(event.target.value)}
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-foreground">
              Grund (optional)
            </span>
            <input
              className={inputClassName}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Kontrolluntersuchung, Blutdruck, …"
            />
          </label>

          <button type="submit" disabled={isSaving} className="btn-primary w-full">
            {isSaving ? "Wird gespeichert…" : "Termin speichern"}
          </button>
        </form>
      ) : null}

      <AppointmentSection
        title="Bevorstehend"
        emptyText="Noch keine Termine. Buchen Sie auf Doctolib und tragen Sie den Termin dann hier ein."
        appointments={upcoming}
        expandedId={expandedId}
        preparationById={preparationById}
        loadingPreparationId={loadingPreparationId}
        notesDraftById={notesDraftById}
        prepNotesDraftById={prepNotesDraftById}
        onExpandPreparation={expandPreparation}
        onCollapsePreparation={collapsePreparation}
        onNotesChange={(id, value) =>
          setNotesDraftById((current) => ({ ...current, [id]: value }))
        }
        onPrepNotesChange={(id, value) =>
          setPrepNotesDraftById((current) => ({ ...current, [id]: value }))
        }
        onSaveNotes={saveNotes}
        onSavePreparationNotes={savePreparationNotes}
        onCancel={cancelAppointment}
        isSaving={isSaving}
        savedPrepNotesId={savedPrepNotesId}
      />

      <AppointmentSection
        title="Vergangen"
        emptyText="Noch keine vergangenen Termine."
        appointments={past}
        expandedId={expandedId}
        preparationById={preparationById}
        loadingPreparationId={loadingPreparationId}
        notesDraftById={notesDraftById}
        prepNotesDraftById={prepNotesDraftById}
        onExpandPreparation={expandPreparation}
        onCollapsePreparation={collapsePreparation}
        onNotesChange={(id, value) =>
          setNotesDraftById((current) => ({ ...current, [id]: value }))
        }
        onPrepNotesChange={(id, value) =>
          setPrepNotesDraftById((current) => ({ ...current, [id]: value }))
        }
        onSaveNotes={saveNotes}
        onSavePreparationNotes={savePreparationNotes}
        onCancel={cancelAppointment}
        isSaving={isSaving}
        showPastPrompts
        savedPrepNotesId={savedPrepNotesId}
      />
    </main>
  );
}

function AppointmentSection({
  title,
  emptyText,
  appointments,
  expandedId,
  preparationById,
  loadingPreparationId,
  notesDraftById,
  prepNotesDraftById,
  onExpandPreparation,
  onCollapsePreparation,
  onNotesChange,
  onPrepNotesChange,
  onSaveNotes,
  onSavePreparationNotes,
  onCancel,
  isSaving,
  showPastPrompts = false,
  savedPrepNotesId = null,
}: {
  title: string;
  emptyText: string;
  appointments: AppointmentRecord[];
  expandedId: string | null;
  preparationById: Record<string, string>;
  loadingPreparationId: string | null;
  notesDraftById: Record<string, string>;
  prepNotesDraftById: Record<string, string>;
  onExpandPreparation: (appointment: AppointmentRecord) => void;
  onCollapsePreparation: () => void;
  onNotesChange: (id: string, value: string) => void;
  onPrepNotesChange: (id: string, value: string) => void;
  onSaveNotes: (id: string) => void;
  onSavePreparationNotes: (id: string) => void;
  onCancel: (id: string) => void;
  isSaving: boolean;
  showPastPrompts?: boolean;
  savedPrepNotesId?: string | null;
}) {
  return (
    <section>
      <h3 className="mb-3 text-base font-bold uppercase tracking-wide text-muted">
        {title}
      </h3>

      {appointments.length === 0 ? (
        <p className="text-sm text-muted">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => {
            const preparation =
              preparationById[appointment.id] ??
              appointment.preparation_text ??
              "";
            const needsNotes =
              showPastPrompts && appointmentNeedsNotes(appointment);

            return (
              <article key={appointment.id} className="noor-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Stethoscope
                        size={18}
                        className="text-primary"
                        aria-hidden="true"
                      />
                      <h4 className="text-lg font-bold text-foreground">
                        {appointment.doctor_name}
                      </h4>
                    </div>
                    <p className="mt-1 text-sm text-primary">
                      {formatAppointmentDateTime(appointment.scheduled_at)}
                    </p>
                    {appointment.reason ? (
                      <p className="text-body mt-2 text-muted">
                        {appointment.reason}
                      </p>
                    ) : null}
                  </div>

                  {!showPastPrompts ? (
                    <button
                      type="button"
                      onClick={() => void onCancel(appointment.id)}
                      className="rounded-xl p-2 text-muted transition-colors hover:bg-background hover:text-red-600"
                      aria-label="Termin löschen"
                    >
                      <Trash2 size={18} />
                    </button>
                  ) : null}
                </div>

                {!showPastPrompts ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (expandedId === appointment.id) {
                          onCollapsePreparation();
                        } else {
                          onExpandPreparation(appointment);
                        }
                      }}
                      className="btn-primary w-full"
                      disabled={loadingPreparationId === appointment.id}
                    >
                      {loadingPreparationId === appointment.id ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Vorbereitung wird erstellt…
                        </>
                      ) : expandedId === appointment.id ? (
                        "Vorbereitung schließen"
                      ) : (
                        "Vorbereitung anzeigen"
                      )}
                    </button>
                    <a
                      href={buildDoctolibSearchUrl(appointment.doctor_name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm font-medium text-sky-800 transition-colors hover:text-sky-900 hover:underline"
                    >
                      Praxis auf Doctolib öffnen
                    </a>
                  </div>
                ) : null}

                {expandedId === appointment.id ? (
                  <div className="mt-4 space-y-4">
                    {preparation ? (
                      <div className="rounded-2xl bg-primary-light px-4 py-3 text-sm whitespace-pre-line text-foreground">
                        <p className="mb-2 font-semibold">Vorschläge aus Ihren Laborwerten</p>
                        {preparation}
                      </div>
                    ) : null}

                    {!showPastPrompts ? (
                      <div className="rounded-2xl border border-primary/20 bg-background p-4">
                        <p className="text-sm font-semibold text-foreground">
                          Ihre Fragen & Notizen
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          Was möchten Sie beim Arzt ansprechen?
                        </p>
                        <textarea
                          className={`${prepNotesInputClassName} mt-3`}
                          value={
                            prepNotesDraftById[appointment.id] ??
                            appointment.preparation_notes ??
                            ""
                          }
                          onChange={(event) =>
                            onPrepNotesChange(appointment.id, event.target.value)
                          }
                          placeholder="z.B. Schmerzen, Medikamente, Laborwerte, Nebenwirkungen…"
                        />
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void onSavePreparationNotes(appointment.id)}
                          className="btn-primary mt-3 w-full"
                        >
                          Fragen & Notizen speichern
                        </button>
                        {savedPrepNotesId === appointment.id ? (
                          <p
                            className="mt-2 text-center text-sm font-semibold text-primary"
                            role="status"
                          >
                            Gespeichert ✓
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {needsNotes ? (
                  <div className="mt-4 rounded-2xl border border-primary/20 bg-background p-4">
                    <p className="text-sm font-semibold text-foreground">
                      Was hat der Arzt gesagt?
                    </p>
                    <textarea
                      className={`${inputClassName} mt-3 min-h-28`}
                      value={notesDraftById[appointment.id] ?? ""}
                      onChange={(event) =>
                        onNotesChange(appointment.id, event.target.value)
                      }
                      placeholder="Notizen vom Termin…"
                    />
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void onSaveNotes(appointment.id)}
                      className="btn-primary mt-3 w-full"
                    >
                      Notizen speichern
                    </button>
                  </div>
                ) : null}

                {appointment.notes ? (
                  <div className="mt-4 rounded-2xl bg-background px-4 py-3 text-sm text-foreground">
                    <p className="font-semibold">Ihre Notizen</p>
                    <p className="mt-2 whitespace-pre-line text-muted">
                      {appointment.notes}
                    </p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
