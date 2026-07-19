"use client";

import {
  activityOptions,
  genderOptions,
  sportTypeOptions,
  type ActivityLevel,
  type ProfileGender,
  type ProfileHealthData,
  type SportType,
} from "@/types/profile-health";

const inputClassName =
  "min-h-12 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base font-normal outline-none focus:border-primary";

type ProfileHealthFieldsProps = {
  value: ProfileHealthData;
  onChange: (value: ProfileHealthData) => void;
};

export function ProfileHealthFields({ value, onChange }: ProfileHealthFieldsProps) {
  function update<K extends keyof ProfileHealthData>(
    key: K,
    next: ProfileHealthData[K],
  ) {
    onChange({ ...value, [key]: next });
  }

  function toggleSportType(sport: SportType) {
    const next = value.sportTypes.includes(sport)
      ? value.sportTypes.filter((entry) => entry !== sport)
      : [...value.sportTypes, sport];
    update("sportTypes", next);
  }

  function selectActivity(level: ActivityLevel) {
    onChange({
      ...value,
      activityLevel: level,
      sportTypes: level === "sedentary" ? [] : value.sportTypes,
    });
  }

  return (
    <div className="grid gap-5">
      <label className="flex flex-col gap-2 text-base font-semibold text-foreground">
        Geburtsdatum
        <input
          type="date"
          value={value.dateOfBirth}
          onChange={(event) => update("dateOfBirth", event.target.value)}
          className={inputClassName}
        />
      </label>

      <div>
        <span className="mb-3 block text-base font-semibold text-foreground">
          Geschlecht
        </span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {genderOptions.map((option) => {
            const selected = value.gender === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => update("gender", option.value as ProfileGender)}
                className={`min-h-12 rounded-2xl border px-4 py-3 text-base font-semibold transition-colors ${
                  selected
                    ? "border-primary bg-primary-light text-[#085041]"
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

      <label className="flex flex-col gap-2 text-base font-semibold text-foreground">
        Körpergröße
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            min={140}
            max={220}
            placeholder="z.B. 178"
            value={value.heightCm}
            onChange={(event) => update("heightCm", event.target.value)}
            className={`${inputClassName} pr-14`}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-muted">
            cm
          </span>
        </div>
      </label>

      <label className="flex flex-col gap-2 text-base font-semibold text-foreground">
        Körpergewicht
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            min={40}
            max={200}
            step="0.1"
            placeholder="z.B. 75"
            value={value.weightKg}
            onChange={(event) => update("weightKg", event.target.value)}
            className={`${inputClassName} pr-14`}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-muted">
            kg
          </span>
        </div>
      </label>

      <div>
        <span className="block text-base font-semibold text-foreground">
          Wie aktiv sind Sie?
        </span>
        <p className="mt-1 text-sm text-muted">Im Durchschnitt pro Woche</p>
        <div className="mt-3 grid gap-3">
          {activityOptions.map((option) => {
            const selected = value.activityLevel === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => selectActivity(option.value)}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                  selected
                    ? "border-primary bg-primary-light"
                    : "border-border bg-background hover:border-primary/30"
                }`}
                style={{
                  borderWidth: "0.5px",
                  borderRadius: "12px",
                  padding: "14px 16px",
                }}
                aria-pressed={selected}
              >
                <span className="text-2xl" aria-hidden="true">
                  {option.emoji}
                </span>
                <span>
                  <span className="block text-base font-semibold text-[#085041]">
                    {option.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {option.subtitle}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {value.activityLevel && value.activityLevel !== "sedentary" ? (
        <div>
          <span className="mb-3 block text-base font-semibold text-foreground">
            Welche Sportarten?
          </span>
          <div className="flex flex-wrap gap-2">
            {sportTypeOptions.map((option) => {
              const selected = value.sportTypes.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleSportType(option.value)}
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
      ) : null}
    </div>
  );
}
