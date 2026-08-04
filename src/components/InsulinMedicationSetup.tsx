"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { Toggle } from "@/components/ui/Toggle";
import {
  formatBasalDosage,
  inferInsulinTypeFromName,
  parseBasalDosageUnits,
} from "@/lib/insulin-medications";
import { normalizeTimeValue } from "@/lib/medication-schedule";
import { getMedicationTimeSlotLabel } from "@/lib/i18n/medication-labels";
import type {
  InsulinType,
  MedicationTimeEntry,
  MealInsulinTimeSlot,
  StandardMedicationTimeSlot,
  StoredMedication,
} from "@/types/medication";
import {
  defaultMealInsulinTimeValues,
  defaultTimeSlotValues,
  MEAL_INSULIN_TIME_SLOTS,
  STANDARD_MEDICATION_TIME_SLOTS,
} from "@/types/medication";

type SlotState = {
  enabled: boolean;
  time: string;
};

export type InsulinSetupValue = {
  insulinType: InsulinType;
  dosage: string;
  times: MedicationTimeEntry[];
};

type InsulinMedicationSetupProps = {
  medicationName: string;
  initialMedication?: StoredMedication | null;
  onValuesChange?: (value: InsulinSetupValue | null) => void;
};

export function buildInsulinSetupFromMedication(
  medication: StoredMedication,
): {
  insulinType: InsulinType;
  basalUnits: string;
  mealSlots: Record<MealInsulinTimeSlot, SlotState>;
  basalSlots: Record<StandardMedicationTimeSlot, SlotState>;
} {
  const insulinType = medication.insulin_type ?? "mahlzeit";
  const mealSlots = createDefaultMealSlots();
  const basalSlots = createDefaultBasalSlots();

  for (const entry of medication.times) {
    if (insulinType === "mahlzeit" && isMealSlot(entry.slot)) {
      mealSlots[entry.slot] = {
        enabled: true,
        time: normalizeTimeValue(entry.time),
      };
    }

    if (insulinType === "basal" && isStandardSlot(entry.slot)) {
      basalSlots[entry.slot] = {
        enabled: true,
        time: normalizeTimeValue(entry.time),
      };
    }
  }

  const basalUnits =
    insulinType === "basal"
      ? String(parseBasalDosageUnits(medication.dosage) ?? "")
      : "";

  return { insulinType, basalUnits, mealSlots, basalSlots };
}

export function buildInsulinSavePayload(input: {
  insulinType: InsulinType;
  basalUnits: string;
  mealSlots: Record<MealInsulinTimeSlot, SlotState>;
  basalSlots: Record<StandardMedicationTimeSlot, SlotState>;
  t: ReturnType<typeof useLanguage>["t"];
}): InsulinSetupValue {
  if (input.insulinType === "basal") {
    const units = Number(input.basalUnits);
    const times = STANDARD_MEDICATION_TIME_SLOTS.filter(
      (slot) => input.basalSlots[slot].enabled,
    ).map((slot) => ({
      slot,
      time: normalizeTimeValue(input.basalSlots[slot].time),
      label: getMedicationTimeSlotLabel(slot, input.t),
    }));

    return {
      insulinType: "basal",
      dosage:
        Number.isFinite(units) && units > 0 ? formatBasalDosage(units) : "",
      times,
    };
  }

  const times = MEAL_INSULIN_TIME_SLOTS.filter(
    (slot) => input.mealSlots[slot].enabled,
  ).map((slot) => ({
    slot,
    time: normalizeTimeValue(input.mealSlots[slot].time),
    label: getMedicationTimeSlotLabel(slot, input.t),
  }));

  return {
    insulinType: "mahlzeit",
    dosage: "variabel",
    times,
  };
}

export function InsulinMedicationSetup({
  medicationName,
  initialMedication,
  onValuesChange,
}: InsulinMedicationSetupProps) {
  const { t } = useLanguage();
  const initial = useMemo(
    () =>
      initialMedication
        ? buildInsulinSetupFromMedication(initialMedication)
        : null,
    [initialMedication],
  );

  const [insulinType, setInsulinType] = useState<InsulinType>(
    initial?.insulinType ??
      inferInsulinTypeFromName(medicationName) ??
      "mahlzeit",
  );
  const [basalUnits, setBasalUnits] = useState(initial?.basalUnits ?? "");
  const [mealSlots, setMealSlots] = useState(
    initial?.mealSlots ?? createDefaultMealSlots(),
  );
  const [basalSlots, setBasalSlots] = useState(
    initial?.basalSlots ?? createDefaultBasalSlots(),
  );

  const setupValue = useMemo(
    () =>
      buildInsulinSavePayload({
        insulinType,
        basalUnits,
        mealSlots,
        basalSlots,
        t,
      }),
    [insulinType, basalUnits, mealSlots, basalSlots, t],
  );

  useEffect(() => {
    onValuesChange?.(setupValue.times.length > 0 ? setupValue : null);
  }, [onValuesChange, setupValue]);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-[#085041]">
          {t("insulin_setup_title")}
        </h2>
        <p className="mt-1 text-sm text-[#88856F]">
          {t("insulin_setup_subtitle")}
        </p>
      </div>

      <div>
        <h3 className="text-base font-bold text-foreground">
          {t("insulin_step_type")}
        </h3>
        <div className="mt-3 grid gap-3">
          <InsulinTypeCard
            selected={insulinType === "mahlzeit"}
            title={t("insulin_type_meal")}
            subtitle={t("insulin_type_meal_subtitle")}
            examples={t("insulin_type_meal_examples")}
            icon="🍽️"
            onSelect={() => setInsulinType("mahlzeit")}
          />
          <InsulinTypeCard
            selected={insulinType === "basal"}
            title={t("insulin_type_basal")}
            subtitle={t("insulin_type_basal_subtitle")}
            examples={t("insulin_type_basal_examples")}
            icon="🌙"
            onSelect={() => setInsulinType("basal")}
          />
        </div>
      </div>

      {insulinType === "basal" ? (
        <label className="flex flex-col gap-2">
          <span className="text-base font-bold text-foreground">
            {t("insulin_basal_units_label")}
          </span>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={200}
              value={basalUnits}
              onChange={(event) => setBasalUnits(event.target.value)}
              placeholder={t("insulin_basal_units_placeholder")}
              className="min-h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-foreground"
            />
            <span className="shrink-0 text-base font-semibold text-muted">
              IE
            </span>
          </div>
        </label>
      ) : (
        <div className="rounded-2xl bg-[#F7F6F2] px-4 py-4">
          <p className="text-sm font-medium text-[#085041]">
            {t("insulin_meal_dose_info")}
          </p>
          <p className="mt-2 text-sm text-[#88856F]">
            {t("insulin_meal_dose_hint")}
          </p>
        </div>
      )}

      <div>
        <h3 className="text-base font-bold text-foreground">
          {insulinType === "basal"
            ? t("when_take")
            : t("insulin_meal_timing_title")}
        </h3>

        <div className="mt-4 flex flex-col gap-3">
          {insulinType === "basal"
            ? STANDARD_MEDICATION_TIME_SLOTS.map((slot) => (
                <TimingToggleRow
                  key={slot}
                  label={getMedicationTimeSlotLabel(slot, t)}
                  enabled={basalSlots[slot].enabled}
                  time={basalSlots[slot].time}
                  onToggle={(enabled) =>
                    setBasalSlots((current) => ({
                      ...current,
                      [slot]: { ...current[slot], enabled },
                    }))
                  }
                  onTimeChange={(time) =>
                    setBasalSlots((current) => ({
                      ...current,
                      [slot]: {
                        ...current[slot],
                        time: normalizeTimeValue(time),
                      },
                    }))
                  }
                  timeLabel={t("med_time_label")}
                />
              ))
            : MEAL_INSULIN_TIME_SLOTS.map((slot) => (
                <MealToggleCard
                  key={slot}
                  label={getMedicationTimeSlotLabel(slot, t)}
                  enabled={mealSlots[slot].enabled}
                  onToggle={(enabled) =>
                    setMealSlots((current) => ({
                      ...current,
                      [slot]: { ...current[slot], enabled },
                    }))
                  }
                />
              ))}
        </div>
      </div>
    </section>
  );
}

function InsulinTypeCard({
  selected,
  title,
  subtitle,
  examples,
  icon,
  onSelect,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  examples: string;
  icon: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl border p-4 text-left transition-colors ${
        selected
          ? "border-[#1D9E75] bg-[#E1F5EE]"
          : "border-[#E4E2DB] bg-white"
      }`}
      style={{ borderWidth: "0.5px" }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>
        <div>
          <p className="text-base font-bold text-[#085041]">{title}</p>
          <p className="mt-1 text-sm text-[#88856F]">{subtitle}</p>
          <p className="mt-2 text-xs text-[#88856F]">{examples}</p>
        </div>
      </div>
    </button>
  );
}

function MealToggleCard({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        enabled ? "border-[#1D9E75] bg-[#E1F5EE]" : "border-[#E4E2DB] bg-white"
      }`}
      style={{ borderWidth: "0.5px" }}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-base font-semibold text-[#085041]">{label}</span>
        <Toggle checked={enabled} onChange={onToggle} label={label} />
      </div>
    </div>
  );
}

function TimingToggleRow({
  label,
  enabled,
  time,
  onToggle,
  onTimeChange,
  timeLabel,
}: {
  label: string;
  enabled: boolean;
  time: string;
  onToggle: (enabled: boolean) => void;
  onTimeChange: (time: string) => void;
  timeLabel: string;
}) {
  return (
    <div className="noor-card p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-base font-semibold text-foreground">{label}</span>
        <Toggle checked={enabled} onChange={onToggle} label={label} />
      </div>
      {enabled ? (
        <label className="mt-4 flex flex-col gap-2">
          <span className="text-sm font-semibold text-muted">{timeLabel}</span>
          <input
            type="time"
            value={time}
            onChange={(event) => onTimeChange(event.target.value)}
            className="w-full rounded-xl border border-[#E4E2DB] bg-[#F7F6F2] px-4 py-3 text-base font-medium text-[#085041] outline-none"
            style={{ borderWidth: "0.5px" }}
          />
        </label>
      ) : null}
    </div>
  );
}

function createDefaultMealSlots(): Record<MealInsulinTimeSlot, SlotState> {
  return {
    before_breakfast: {
      enabled: false,
      time: defaultMealInsulinTimeValues.before_breakfast,
    },
    before_lunch: {
      enabled: false,
      time: defaultMealInsulinTimeValues.before_lunch,
    },
    before_dinner: {
      enabled: false,
      time: defaultMealInsulinTimeValues.before_dinner,
    },
  };
}

function createDefaultBasalSlots(): Record<
  StandardMedicationTimeSlot,
  SlotState
> {
  return {
    morning: { enabled: false, time: defaultTimeSlotValues.morning },
    midday: { enabled: false, time: defaultTimeSlotValues.midday },
    evening: { enabled: true, time: defaultTimeSlotValues.evening },
    night: { enabled: false, time: defaultTimeSlotValues.night },
  };
}

function isMealSlot(slot: string): slot is MealInsulinTimeSlot {
  return (
    slot === "before_breakfast" ||
    slot === "before_lunch" ||
    slot === "before_dinner"
  );
}

function isStandardSlot(slot: string): slot is StandardMedicationTimeSlot {
  return (
    slot === "morning" ||
    slot === "midday" ||
    slot === "evening" ||
    slot === "night"
  );
}
