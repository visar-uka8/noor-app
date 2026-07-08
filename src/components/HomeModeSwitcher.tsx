"use client";

export type HomeViewMode = "self" | "family";

type HomeModeSwitcherProps = {
  mode: HomeViewMode;
  familyLabel: string;
  onChange: (mode: HomeViewMode) => void;
};

export function HomeModeSwitcher({
  mode,
  familyLabel,
  onChange,
}: HomeModeSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Ansicht wechseln"
      className="mt-4 inline-flex rounded-full bg-white/20 p-1"
    >
      <ModePill
        label="Ich"
        selected={mode === "self"}
        onClick={() => onChange("self")}
      />
      <ModePill
        label={familyLabel}
        selected={mode === "family"}
        onClick={() => onChange("family")}
      />
    </div>
  );
}

function ModePill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-9 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
        selected
          ? "bg-white text-primary shadow-sm"
          : "text-white/90 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
