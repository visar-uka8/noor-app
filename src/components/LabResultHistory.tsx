"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CardListSkeleton, FeatureEmptyState } from "@/components/AppStates";
import { LabResultStatusSummary } from "@/components/LabResultStatusSummary";
import { useLanguage } from "@/components/LanguageProvider";
import { formatLocalizedDate } from "@/lib/i18n/messages";
import type { LabResultRecord } from "@/types/lab-results";

const LONG_PRESS_MS = 550;

type LabResultHistoryProps = {
  onSelect: (result: LabResultRecord) => void;
  refreshKey?: number;
  resultsEndpoint?: string;
  allowDelete?: boolean;
};

export function LabResultHistory({
  onSelect,
  refreshKey = 0,
  resultsEndpoint = "/api/lab-results",
  allowDelete = false,
}: LabResultHistoryProps) {
  const { language, t } = useLanguage();
  const [results, setResults] = useState<LabResultRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<LabResultRecord | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setIsLoading(true);

      try {
        const response = await fetch(resultsEndpoint, {
          credentials: "include",
        });

        if (!response.ok) {
          const body = await response.text();
          console.error("Lab history fetch failed", response.status, body);
          if (!cancelled) setResults([]);
          return;
        }

        const data = (await response.json()) as { results?: LabResultRecord[] };

        if (!cancelled) {
          setResults(data?.results ?? []);
        }
      } catch (error) {
        console.error("Lab history fetch error:", error);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, resultsEndpoint]);

  async function confirmDelete() {
    if (!pendingDelete || !allowDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/lab-results/${pendingDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? t("lab.deleteFailed"));
      }

      setResults((current) =>
        current.filter((result) => result.id !== pendingDelete.id),
      );
      setPendingDelete(null);
    } catch (error) {
      console.error("Lab result delete failed:", error);
      setDeleteError(
        error instanceof Error ? error.message : t("lab.deleteFailed"),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="mt-8" aria-label={t("lab.historyTitle")}>
      <h2 className="heading-lg mb-4">{t("lab.historyTitle")}</h2>

      {isLoading ? (
        <CardListSkeleton />
      ) : results.length === 0 ? (
        <FeatureEmptyState
          emoji="🧪"
          title={t("lab.historyEmptyTitle")}
          subtitle={t("lab.historyEmptySubtitle")}
        />
      ) : (
        <div className="flex flex-col">
          {results.map((result) => (
            <HistoryCard
              key={result.id}
              result={result}
              allowDelete={allowDelete}
              dateLabel={formatLocalizedDate(language, result.created_at)}
              analyzedLabel={t("lab.analyzed")}
              deleteLabel={t("lab.delete")}
              onSelect={() => onSelect(result)}
              onRequestDelete={() => {
                setDeleteError(null);
                setPendingDelete(result);
              }}
            />
          ))}
        </div>
      )}

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lab-delete-dialog-title"
        >
          <div className="w-full max-w-app rounded-2xl border border-border bg-surface p-5 shadow-[var(--warm-shadow)]">
            <h3
              id="lab-delete-dialog-title"
              className="text-xl font-bold text-foreground"
            >
              {t("lab.deleteConfirmTitle")}
            </h3>
            <p className="mt-3 text-base leading-relaxed text-muted">
              {t("lab.deleteConfirmMessage")}
            </p>
            {deleteError ? (
              <p className="mt-3 text-sm font-medium text-red-600">{deleteError}</p>
            ) : null}
            <div className="mt-5 grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (isDeleting) return;
                  setPendingDelete(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="min-h-12 rounded-2xl border border-border px-4 py-3 text-base font-semibold text-foreground transition-colors hover:bg-background disabled:opacity-60"
              >
                {t("lab.deleteCancel")}
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
                className="min-h-12 rounded-2xl bg-red-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? t("lab.deleting") : t("lab.delete")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function HistoryCard({
  result,
  allowDelete,
  dateLabel,
  analyzedLabel,
  deleteLabel,
  onSelect,
  onRequestDelete,
}: {
  result: LabResultRecord;
  allowDelete: boolean;
  dateLabel: string;
  analyzedLabel: string;
  deleteLabel: string;
  onSelect: () => void;
  onRequestDelete: () => void;
}) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  function clearLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function startLongPress() {
    if (!allowDelete) return;
    longPressTriggeredRef.current = false;
    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onRequestDelete();
    }, LONG_PRESS_MS);
  }

  useEffect(() => {
    return () => clearLongPress();
  }, []);

  return (
    <div
      style={{
        position: "relative",
        marginBottom: "10px",
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (longPressTriggeredRef.current) {
            longPressTriggeredRef.current = false;
            return;
          }
          onSelect();
        }}
        onContextMenu={(event) => {
          if (!allowDelete) return;
          event.preventDefault();
          onRequestDelete();
        }}
        onTouchStart={startLongPress}
        onTouchEnd={clearLongPress}
        onTouchCancel={clearLongPress}
        onTouchMove={clearLongPress}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          startLongPress();
        }}
        onMouseUp={clearLongPress}
        onMouseLeave={clearLongPress}
        aria-label={`${dateLabel} — ${analyzedLabel}`}
        style={{
          display: "block",
          width: "100%",
          padding: "16px",
          paddingRight: allowDelete ? "52px" : "16px",
          borderRadius: "16px",
          border: "0.5px solid #E4E2DB",
          background: "#FFFFFF",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "17px",
            fontWeight: 600,
            color: "#085041",
            textAlign: "left",
          }}
        >
          {dateLabel}
        </p>
        <span
          style={{
            display: "inline-block",
            marginTop: "6px",
            borderRadius: "9999px",
            background: "#E1F5EE",
            padding: "4px 12px",
            fontSize: "13px",
            fontWeight: 600,
            color: "#085041",
          }}
        >
          {analyzedLabel}
        </span>
        <div style={{ marginTop: "8px" }}>
          <LabResultStatusSummary result={result} />
        </div>
      </button>

      {allowDelete ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRequestDelete();
          }}
          aria-label={deleteLabel}
          className="absolute right-3 top-3 flex min-h-10 min-w-10 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50"
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
