"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  buildInsulinHistory,
  formatInsulinDayLog,
} from "@/lib/insulin-history";
import type { StoredConfirmation } from "@/types/medication";

type InsulinHistorySectionProps = {
  medicationId: string;
};

export function InsulinHistorySection({
  medicationId,
}: InsulinHistorySectionProps) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);

      try {
        const response = await fetchWithTimeout(
          `/api/medications/${medicationId}/insulin-log`,
          { credentials: "include" },
        );

        if (!response.ok) {
          throw new Error("history load failed");
        }

        const data = (await response.json()) as {
          confirmations?: StoredConfirmation[];
        };

        const history = buildInsulinHistory(data.confirmations ?? [], 7);
        setRows(history.map(formatInsulinDayLog));
      } catch {
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    }

    void loadHistory();
  }, [medicationId]);

  return (
    <section className="mt-8 rounded-2xl border border-[#E4E2DB] bg-white p-4">
      <h2 className="text-base font-bold text-[#085041]">
        {t("insulin_history_title")}
      </h2>
      {isLoading ? (
        <p className="mt-3 text-sm text-muted">{t("med_loading")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t("insulin_history_empty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row} className="text-sm text-[#085041]">
              {row}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
