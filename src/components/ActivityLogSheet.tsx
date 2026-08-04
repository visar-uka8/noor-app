"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/components/LanguageProvider";
import { durationOptions, type ActivityType } from "@/types/activity-log";

type ActivityLogSheetProps = {
  open: boolean;
  activityType: ActivityType | null;
  activityTitle: string;
  activityEmoji: string;
  initialSteps: number | "";
  isSaving: boolean;
  saveError: string | null;
  onClose: () => void;
  onSave: (data: {
    durationMinutes: number;
    stepsToday: number | "";
    note: string;
  }) => void;
};

export function ActivityLogSheet({
  open,
  activityType,
  activityTitle,
  activityEmoji,
  initialSteps,
  isSaving,
  saveError,
  onClose,
  onSave,
}: ActivityLogSheetProps) {
  const { t } = useLanguage();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [stepsToday, setStepsToday] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    setDurationMinutes(null);
    setStepsToday(initialSteps);
    setNote("");
    setValidationError(null);
  }, [open, activityType, initialSteps]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !activityType || activityType === "rest" || !mounted) {
    return null;
  }

  function handleSave() {
    if (durationMinutes == null) {
      setValidationError(t("activity_select_duration"));
      return;
    }

    setValidationError(null);
    onSave({ durationMinutes, stepsToday, note });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/30"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-app rounded-t-[20px] bg-white p-6"
        style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2
          id={titleId}
          className="mb-5 text-lg font-semibold text-[#085041]"
        >
          <span aria-hidden="true">{activityEmoji} </span>
          {activityTitle}
        </h2>

        <div>
          <span className="block text-base font-semibold text-foreground">
            {t("how_long")}
          </span>
          <div className="mt-3 flex flex-wrap gap-2">
            {durationOptions.map((option) => {
              const selected = durationMinutes === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setDurationMinutes(option.value);
                    setValidationError(null);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-background text-foreground hover:border-primary/40"
                  }`}
                  aria-pressed={selected}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-medium text-[#085041]">
            🚶 {t("activity_steps_today_label")}
          </span>
          <input
            type="number"
            inputMode="numeric"
            placeholder={t("activity_steps_placeholder")}
            value={stepsToday}
            onChange={(event) => {
              const next = event.target.value;
              setStepsToday(next === "" ? "" : Number(next));
            }}
            className="min-h-12 w-full rounded-xl border border-[#E4E2DB] px-3 text-base text-foreground outline-none focus:border-primary"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-[#88856F]">
            {t("note_optional")}
          </span>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("activity_note_placeholder")}
            className="min-h-11 w-full rounded-xl border border-[#E4E2DB] px-3 text-base text-foreground outline-none focus:border-primary"
          />
        </label>

        {validationError || saveError ? (
          <p className="mt-3 text-sm font-semibold text-danger" role="alert">
            {validationError ?? saveError}
          </p>
        ) : null}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="btn-touch flex-1 rounded-2xl border-2 border-border bg-surface px-4 py-3 text-base font-semibold text-muted disabled:opacity-60"
          >
            {t("close")}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="btn-primary flex-1 gap-2 px-4 py-3 text-base disabled:opacity-70"
          >
            {isSaving && <Loader2 size={20} className="animate-spin" />}
            {t("save_activity")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
