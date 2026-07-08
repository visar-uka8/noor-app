"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Filter,
  Search,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ErrorState } from "@/components/AppStates";
import { demoPatientId, type AppointmentPayload } from "@/types/appointments";
import { doctors, type Doctor } from "@/types/doctors";

type FilterKey = "availableToday" | "videoConsultation";
type BookingStep = "search" | "date" | "confirm" | "success";

const timeSlots = ["09:00", "10:30", "11:30", "14:00", "15:30", "17:00"];

const availabilityStyles = {
  now: {
    label: "Jetzt verfügbar",
    badge: "bg-primary-light text-primary-dark",
    dot: "bg-primary animate-pulse",
  },
  today: {
    label: "Heute noch verfügbar",
    badge: "bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
  },
};

export function DoctorSearch() {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [step, setStep] = useState<BookingStep>("search");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [reason, setReason] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredDoctors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return doctors.filter((doctor) => {
      const matchesQuery =
        !normalizedQuery ||
        doctor.name.toLowerCase().includes(normalizedQuery) ||
        doctor.specialization.toLowerCase().includes(normalizedQuery);
      const matchesAvailableToday =
        !activeFilters.has("availableToday") ||
        doctor.availability === "now" ||
        doctor.availability === "today";
      const matchesVideo =
        !activeFilters.has("videoConsultation") || doctor.videoConsultation;

      return matchesQuery && matchesAvailableToday && matchesVideo;
    });
  }, [activeFilters, query]);

  function toggleFilter(filter: FilterKey) {
    setActiveFilters((current) => {
      const next = new Set(current);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  }

  function startBooking(doctor: Doctor) {
    setSelectedDoctor(doctor);
    setSelectedDate(startOfToday());
    setSelectedTime("09:00");
    setReason("");
    setErrorMessage(null);
    setStep("date");
  }

  async function confirmBooking() {
    if (!selectedDoctor) return;

    setIsConfirming(true);
    setErrorMessage(null);

    try {
      const appointment: AppointmentPayload = {
        patient_id: demoPatientId,
        doctor_name: selectedDoctor.name,
        doctor_specialization: selectedDoctor.specialization,
        scheduled_at: createScheduledAt(selectedDate, selectedTime).toISOString(),
        consultation_type: "Video",
        fee: selectedDoctor.fee,
        reason: reason.trim() || null,
        status: "confirmed",
      };
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointment),
      });

      if (!response.ok) throw new Error("Appointment request failed.");

      setStep("success");
    } catch {
      setErrorMessage(
        "Termin konnte gerade nicht bestätigt werden. Bitte versuchen Sie es später erneut.",
      );
    } finally {
      setIsConfirming(false);
    }
  }

  if (step === "date" && selectedDoctor) {
    return (
      <DateSelectionStep
        doctor={selectedDoctor}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onBack={() => setStep("search")}
        onSelectDate={setSelectedDate}
        onSelectTime={setSelectedTime}
        onContinue={() => setStep("confirm")}
      />
    );
  }

  if (step === "confirm" && selectedDoctor) {
    return (
      <ConfirmationStep
        doctor={selectedDoctor}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        reason={reason}
        isConfirming={isConfirming}
        errorMessage={errorMessage}
        onBack={() => setStep("date")}
        onCancel={() => setStep("search")}
        onReasonChange={setReason}
        onConfirm={confirmBooking}
      />
    );
  }

  if (step === "success" && selectedDoctor) {
    return (
      <SuccessStep
        doctor={selectedDoctor}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
      />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
      <section aria-label="Arzt suchen">
        <div className="flex gap-3">
          <label className="relative flex min-h-12 flex-1 items-center">
            <Search
              className="absolute left-4 text-muted"
              size={22}
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Facharzt suchen..."
              className="min-h-12 w-full rounded-2xl border border-border bg-surface py-3 pl-12 pr-4 text-base text-foreground shadow-[var(--warm-shadow)] outline-none placeholder:text-muted focus:border-primary"
            />
          </label>

          <button
            type="button"
            className="flex min-h-12 min-w-12 items-center justify-center rounded-2xl border border-border bg-surface text-primary shadow-[var(--warm-shadow)] transition-colors hover:border-primary/30"
            aria-label="Filter öffnen"
          >
            <Filter size={24} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <FilterChip
            active={activeFilters.has("availableToday")}
            onClick={() => toggleFilter("availableToday")}
          >
            Verfügbar heute
          </FilterChip>
          <FilterChip
            active={activeFilters.has("videoConsultation")}
            onClick={() => toggleFilter("videoConsultation")}
          >
            Videosprechstunde
          </FilterChip>
        </div>
      </section>

      <section className="mt-6 flex flex-col gap-4" aria-label="Ärzteliste">
        {filteredDoctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} onBook={startBooking} />
        ))}

        {filteredDoctors.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-5 text-center text-base text-muted shadow-[var(--warm-shadow)]">
            Kein passender Arzt gefunden. Versuchen Sie einen anderen Suchbegriff.
          </p>
        )}
      </section>
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-12 rounded-full border px-4 py-2 text-base font-semibold transition-colors ${
        active
          ? "border-primary bg-primary text-white"
          : "border-border bg-surface text-foreground hover:border-primary/30"
      }`}
    >
      {children}
    </button>
  );
}

function DoctorCard({
  doctor,
  onBook,
}: {
  doctor: Doctor;
  onBook: (doctor: Doctor) => void;
}) {
  const availability = availabilityStyles[doctor.availability];

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow)]">
      <div className="flex gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-light text-xl font-bold text-primary-dark"
          aria-hidden="true"
        >
          {doctor.initials}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold leading-tight text-foreground">
            {doctor.name}
          </h2>
          <p className="mt-1 text-base text-muted">{doctor.specialization}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1" aria-label={`${doctor.rating} von 5 Sternen`}>
              <span className="text-base font-bold text-foreground">
                {doctor.rating.toFixed(1)}
              </span>
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  size={16}
                  className="fill-amber-400 text-amber-400"
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${availability.badge}`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${availability.dot}`}
            aria-hidden="true"
          />
          {availability.label}
        </span>
        <span className="text-base font-semibold text-foreground">
          €{doctor.fee} pro Sitzung
        </span>
      </div>

      <button
        type="button"
        onClick={() => onBook(doctor)}
        className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
      >
        Termin buchen
      </button>
    </article>
  );
}

function DateSelectionStep({
  doctor,
  selectedDate,
  selectedTime,
  onBack,
  onSelectDate,
  onSelectTime,
  onContinue,
}: {
  doctor: Doctor;
  selectedDate: Date;
  selectedTime: string;
  onBack: () => void;
  onSelectDate: (date: Date) => void;
  onSelectTime: (time: string) => void;
  onContinue: () => void;
}) {
  const days = getNextSevenDays();

  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
      <BackButton onClick={onBack} label="Zurück zur Arztsuche" />
      <DoctorHeader doctor={doctor} />

      <section className="mt-6" aria-label="Datum auswählen">
        <h2 className="mb-3 text-lg font-bold text-foreground">Datum wählen</h2>
        <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
          {days.map((day) => {
            const selected = isSameDay(day, selectedDate);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDate(day)}
                className={`min-h-20 min-w-[5.75rem] rounded-2xl border px-3 py-3 text-center transition-colors ${
                  selected
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-foreground"
                }`}
              >
                <span className="block text-sm font-semibold">
                  {formatDayName(day)}
                </span>
                <span className="mt-1 block text-xl font-bold">
                  {formatDayDate(day)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-5" aria-label="Uhrzeit auswählen">
        <h2 className="mb-3 text-lg font-bold text-foreground">
          Freie Uhrzeiten
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {timeSlots.map((slot) => {
            const selected = slot === selectedTime;

            return (
              <button
                key={slot}
                type="button"
                onClick={() => onSelectTime(slot)}
                className={`min-h-12 rounded-2xl border px-3 py-3 text-base font-bold transition-colors ${
                  selected
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-foreground"
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </section>

      <button
        type="button"
        onClick={onContinue}
        className="mt-6 flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
      >
        Weiter
      </button>
    </main>
  );
}

function ConfirmationStep({
  doctor,
  selectedDate,
  selectedTime,
  reason,
  isConfirming,
  errorMessage,
  onBack,
  onCancel,
  onReasonChange,
  onConfirm,
}: {
  doctor: Doctor;
  selectedDate: Date;
  selectedTime: string;
  reason: string;
  isConfirming: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onCancel: () => void;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
      <BackButton onClick={onBack} label="Zurück zur Datumsauswahl" />

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow)]">
        <h1 className="text-2xl font-bold text-foreground">
          Termin bestätigen
        </h1>
        <dl className="mt-5 flex flex-col gap-3 text-base">
          <SummaryRow label="Arzt" value={doctor.name} />
          <SummaryRow label="Datum" value={formatFullDate(selectedDate)} />
          <SummaryRow label="Uhrzeit" value={`${selectedTime} Uhr`} />
          <SummaryRow label="Art" value="Videosprechstunde" />
          <SummaryRow label="Kosten" value={`€${doctor.fee}`} />
        </dl>

        <label className="mt-5 flex flex-col gap-2 text-base font-semibold text-foreground">
          Grund der Konsultation (optional)
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="z.B. Cholesterin-Werte besprechen"
            rows={4}
            className="rounded-2xl border border-border bg-background px-4 py-3 text-base font-normal outline-none focus:border-primary"
          />
        </label>

        {errorMessage && (
          <div className="mt-4">
            <ErrorState onRetry={onConfirm} />
          </div>
        )}

        <button
          type="button"
          onClick={onConfirm}
          disabled={isConfirming}
          className="mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] disabled:opacity-70"
        >
          {isConfirming
            ? "Termin wird bestätigt..."
            : `Termin bestätigen — €${doctor.fee}`}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="mt-4 min-h-12 w-full text-base font-semibold text-muted underline underline-offset-4"
        >
          Abbrechen
        </button>
      </section>
    </main>
  );
}

function SuccessStep({
  doctor,
  selectedDate,
  selectedTime,
}: {
  doctor: Doctor;
  selectedDate: Date;
  selectedTime: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col items-center justify-center px-5 py-10 text-center">
      <div
        className="flex h-28 w-28 animate-pulse items-center justify-center rounded-full bg-primary-light text-primary"
        aria-hidden="true"
      >
        <CheckCircle2 size={72} strokeWidth={2.4} />
      </div>

      <h1 className="mt-8 text-3xl font-bold text-foreground">
        Termin bestätigt!
      </h1>
      <p className="mt-3 text-lg leading-relaxed text-muted">
        Videosprechstunde mit {getShortDoctorName(doctor.name)} am{" "}
        {formatFullDate(selectedDate)} um {selectedTime} Uhr.
      </p>

      <div className="mt-8 flex w-full flex-col gap-3">
        <Link
          href="/dashboard"
          className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
        >
          Zu meinen Terminen
        </Link>
        <Link
          href="/health-passport"
          className="flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-primary bg-surface px-5 py-4 text-base font-semibold text-primary transition-colors hover:bg-primary-light active:scale-[0.98]"
        >
          Ergebnisse vorab teilen
        </Link>
      </div>
    </main>
  );
}

function DoctorHeader({ doctor }: { doctor: Doctor }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow)]">
      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-light text-xl font-bold text-primary-dark"
          aria-hidden="true"
        >
          {doctor.initials}
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight text-foreground">
            {doctor.name}
          </h1>
          <p className="mt-1 text-base text-muted">{doctor.specialization}</p>
        </div>
      </div>
    </section>
  );
}

function BackButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 flex min-h-12 items-center gap-2 self-start rounded-2xl px-1 text-base font-semibold text-primary"
    >
      <ArrowLeft size={22} strokeWidth={2.4} aria-hidden="true" />
      {label}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-3 last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-bold text-foreground">{value}</dd>
    </div>
  );
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getNextSevenDays() {
  return Array.from({ length: 7 }).map((_, index) => {
    const date = startOfToday();
    date.setDate(date.getDate() + index);
    return date;
  });
}

function isSameDay(left: Date, right: Date) {
  return left.toDateString() === right.toDateString();
}

function formatDayName(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(date);
}

function formatDayDate(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "long",
  }).format(date);
}

function createScheduledAt(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const scheduledAt = new Date(date);
  scheduledAt.setHours(hours, minutes, 0, 0);
  return scheduledAt;
}

function getShortDoctorName(name: string) {
  const parts = name.split(" ");
  if (parts.length >= 3) return `${parts[0]} ${parts[parts.length - 1]}`;
  return name;
}
