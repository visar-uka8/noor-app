"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import {
  formatGoalProgressValue,
  formatGoalTargetValue,
  getGoalProgressRatio,
} from "@/lib/health-goals-data";

type GoalRowProps = {
  emoji: string;
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  showInput?: boolean;
  inputPlaceholder?: string;
  quickButtons?: string[];
  onSave: (value: number) => Promise<void>;
  isSaving?: boolean;
  isLast?: boolean;
};

export function GoalRow({
  emoji,
  label,
  current,
  goal,
  unit,
  color,
  showInput = false,
  inputPlaceholder,
  quickButtons,
  onSave,
  isSaving = false,
  isLast = false,
}: GoalRowProps) {
  const [inputValue, setInputValue] = useState("");
  const reached = goal > 0 && current >= goal;
  const progress = getGoalProgressRatio(current, goal);
  const decimals = unit === "L" ? 1 : 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!inputValue.trim()) return;

    const normalized = inputValue.trim().replace(",", ".");
    const parsed =
      unit === "L"
        ? Number.parseFloat(normalized)
        : Number.parseInt(normalized, 10);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return;
    }

    await onSave(unit === "L" ? Math.round(parsed * 10) / 10 : parsed);
    setInputValue("");
  }

  async function handleQuickButton(value: string) {
    const parsed = Number.parseFloat(value.replace(",", "."));
    if (!Number.isFinite(parsed)) return;
    await onSave(parsed);
  }

  return (
    <div
      style={{
        paddingBottom: isLast ? 0 : "14px",
        marginBottom: isLast ? 0 : "14px",
        borderBottom: isLast ? "none" : "0.5px solid #E4E2DB",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "15px",
            fontWeight: 600,
            color: reached ? "#1D9E75" : "#085041",
          }}
        >
          <span aria-hidden="true">{emoji}</span>
          <span>{label}</span>
          {reached ? (
            <Check size={16} color="#1D9E75" aria-label="Ziel erreicht" />
          ) : null}
        </div>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: reached ? "#1D9E75" : "#085041",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatGoalProgressValue(current, unit, { decimals })} /{" "}
          {formatGoalTargetValue(goal, unit, { decimals })}
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          height: "8px",
          borderRadius: "999px",
          backgroundColor: "#E4E2DB",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(progress * 100)}%`,
            borderRadius: "999px",
            backgroundColor: reached ? "#1D9E75" : color,
            transition: "width 0.25s ease, background-color 0.25s ease",
          }}
        />
      </div>

      {showInput ? (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          style={{ marginTop: "10px" }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              inputMode={unit === "L" ? "decimal" : "numeric"}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={inputPlaceholder}
              disabled={isSaving}
              style={{
                flex: 1,
                minHeight: "40px",
                borderRadius: "12px",
                border: "0.5px solid #E4E2DB",
                padding: "0 12px",
                fontSize: "14px",
                color: "#085041",
                backgroundColor: "#FFFFFF",
              }}
            />
            <button
              type="submit"
              disabled={isSaving || !inputValue.trim()}
              style={{
                minHeight: "40px",
                borderRadius: "12px",
                border: "none",
                padding: "0 14px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#FFFFFF",
                backgroundColor: "#1D9E75",
                opacity: isSaving || !inputValue.trim() ? 0.6 : 1,
                cursor: isSaving || !inputValue.trim() ? "not-allowed" : "pointer",
              }}
            >
              Speichern
            </button>
          </div>

          {quickButtons && quickButtons.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                marginTop: "8px",
              }}
            >
              {quickButtons.map((buttonValue) => (
                <button
                  key={buttonValue}
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleQuickButton(buttonValue)}
                  style={{
                    borderRadius: "999px",
                    border: "0.5px solid #E4E2DB",
                    backgroundColor:
                      current === Number.parseFloat(buttonValue)
                        ? "#E1F5EE"
                        : "#FFFFFF",
                    color: "#085041",
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "6px 10px",
                    cursor: isSaving ? "not-allowed" : "pointer",
                  }}
                >
                  {buttonValue} L
                </button>
              ))}
            </div>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
