"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_FIELD_LABELS,
  SHOW_LANGUAGE_SELECTOR,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from "@/lib/i18n/languages";

type LanguageSelectorProps = {
  value: AppLanguage;
  onChange: (language: AppLanguage) => void;
  variant?: "registration" | "settings";
  disabled?: boolean;
};

export function LanguageSelector({
  value,
  onChange,
  variant = "settings",
  disabled = false,
}: LanguageSelectorProps) {
  if (!SHOW_LANGUAGE_SELECTOR) {
    return null;
  }

  const [open, setOpen] = useState(false);
  const sheetTitleId = useId();
  const labelClassName =
    variant === "registration"
      ? "text-base font-semibold text-foreground"
      : "text-[15px] font-semibold text-[#1E1D1B]";

  const label = LANGUAGE_FIELD_LABELS[value];
  const selectedLanguage =
    SUPPORTED_LANGUAGES.find((language) => language.code === value) ??
    SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSelect(language: AppLanguage) {
    onChange(language);
    setOpen(false);
  }

  return (
    <>
      <div className={variant === "settings" ? "px-4 py-3.5" : undefined}>
        <div className="flex w-full flex-col items-start gap-2">
          <span className={`block w-full text-left ${labelClassName}`}>{label}</span>
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={sheetTitleId}
            onClick={() => setOpen(true)}
            className="relative flex min-h-12 w-full items-center justify-start rounded-2xl border border-border bg-background py-3 pl-4 pr-11 text-left text-base font-normal outline-none transition-colors hover:border-primary/40 focus:border-primary disabled:opacity-70"
          >
            <span className="flex items-center gap-3">
              <span aria-hidden="true" className="text-xl">
                {selectedLanguage.flag}
              </span>
              <span>{selectedLanguage.label}</span>
            </span>
            <ChevronDown
              size={20}
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
            />
          </button>
        </div>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[85] bg-black/40"
              onClick={() => setOpen(false)}
              role="presentation"
            >
              <div
                className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-app rounded-t-[20px] bg-surface px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 shadow-[var(--warm-shadow)]"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={sheetTitleId}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <h2
                    id={sheetTitleId}
                    className="text-left text-xl font-bold text-foreground"
                  >
                    {label}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-muted transition-colors hover:bg-primary-light hover:text-primary"
                    aria-label="Schließen"
                  >
                    <X size={24} strokeWidth={2.4} />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {SUPPORTED_LANGUAGES.map((language) => {
                    const selected = language.code === value;

                    return (
                      <button
                        key={language.code}
                        type="button"
                        onClick={() => handleSelect(language.code)}
                        className={`flex min-h-14 w-full items-center rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
                          selected
                            ? "border-primary bg-primary-light"
                            : "border-border bg-surface hover:border-primary/30"
                        }`}
                      >
                        <span className="flex items-center gap-3 text-base font-semibold text-foreground">
                          <span aria-hidden="true" className="text-2xl">
                            {language.flag}
                          </span>
                          {language.label}
                        </span>
                        {selected ? (
                          <Check
                            size={22}
                            strokeWidth={2.5}
                            className="ml-auto shrink-0 text-primary"
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
