"use client";

import { Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "@/components/LanguageProvider";
import { translateLabStatusLabel } from "@/lib/i18n/lab-labels";
import { createClient } from "@/lib/supabase/client";
import type { LabAnalysisResult } from "@/types/lab-results";
import { formatLabResultDate } from "@/types/lab-results";
import {
  getLabValueStatusKey,
  isDoctorVisitUrgent,
  parseLabAnalysis,
  statusBadgeClass,
  type LabValueLevel,
  type LifestylePlan,
  type ParsedLabValue,
} from "@/lib/parse-lab-analysis";
import type { PersonalGoal } from "@/types/health-goals";

type LabResultAnalysisProps = {
  result: LabAnalysisResult;
};

type LabValueFilterKey = "all" | "red" | "amber" | "green";

type ShareProfile = {
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
};

function matchesLabValueFilter(
  value: ParsedLabValue,
  activeFilter: LabValueFilterKey,
) {
  if (activeFilter === "all") return true;

  const statusKey = getLabValueStatusKey(value);

  if (activeFilter === "red") {
    return statusKey === "high" || statusKey === "low";
  }

  if (activeFilter === "amber") {
    return statusKey === "watch";
  }

  if (activeFilter === "green") {
    return statusKey === "normal";
  }

  return true;
}

const BORDER_BY_LEVEL: Record<LabValueLevel, string> = {
  green: "border-l-[#1D9E75]",
  amber: "border-l-[#BA7517]",
  red: "border-l-[#A32D2D]",
};

function formatShareBirthDate(value: string | null | undefined) {
  if (!value?.trim()) return "—";

  const trimmed = value.trim();
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;

  return formatLabResultDate(trimmed);
}

function formatDoctorShareTitle(doctorName: string | null | undefined) {
  const name = doctorName?.trim() ?? "";
  if (!name) return "Laborwerte für den Hausarzt";
  if (/^dr\.?\b/i.test(name)) return `Laborwerte für ${name}`;
  return `Laborwerte für Dr. ${name}`;
}

async function loadDoctorShareContext() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: ShareProfile | null = null;
  let doctorName = "";

  if (user?.id) {
    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name, date_of_birth")
      .eq("id", user.id)
      .maybeSingle<ShareProfile>();

    profile = data;
  }

  try {
    const response = await fetch("/api/health-passport", {
      credentials: "include",
    });
    if (response.ok) {
      const body = (await response.json()) as {
        passport?: { personal?: { familyDoctorName?: string } };
      };
      doctorName = body.passport?.personal?.familyDoctorName?.trim() ?? "";
    }
  } catch (error) {
    console.error("Failed to load Hausarzt for lab share:", error);
  }

  return { profile, doctorName };
}

function buildSharePayload(
  audience: "doctor" | "family",
  analysisText: string,
  createdAt: string | undefined,
  context: { profile: ShareProfile | null; doctorName: string },
) {
  const formattedDate = formatLabResultDate(
    createdAt ?? new Date().toISOString(),
  );

  if (audience === "family") {
    return {
      title: "Meine Laborwerte — Noor Analyse",
      text: `Laboranalyse vom ${formattedDate}\n\n${analysisText}`,
    };
  }

  const firstName = context.profile?.first_name?.trim() ?? "";
  const lastName = context.profile?.last_name?.trim() ?? "";
  const patientName = `${firstName} ${lastName}`.trim() || "—";
  const birthDate = formatShareBirthDate(context.profile?.date_of_birth);

  return {
    title: formatDoctorShareTitle(context.doctorName),
    text: `Patient: ${patientName}\nGeburtsdatum: ${birthDate}\n\n${analysisText}`,
  };
}

function buildShareAnalysisText(parsed: ReturnType<typeof parseLabAnalysis>) {
  const parts = [
    parsed.summary,
    ...parsed.values.map((value) =>
      [value.name, value.meaning, value.tip].filter(Boolean).join("\n"),
    ),
    ...parsed.nextSteps,
    parsed.doctorVisit,
    parsed.disclaimer,
  ];

  return parts.filter(Boolean).join("\n\n");
}

export function LabResultAnalysis({ result }: LabResultAnalysisProps) {
  const { t, language } = useLanguage();
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [localizedParsed, setLocalizedParsed] = useState(() =>
    parseLabAnalysis(result.analysis),
  );
  const [isLocalizing, setIsLocalizing] = useState(false);
  const [translationUnavailable, setTranslationUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLocalizedAnalysis() {
      setIsLocalizing(true);
      setTranslationUnavailable(false);

      try {
        const response = await fetch("/api/lab-results/localize", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            labResultId: result.labResultId,
            analysis: result.analysis,
            targetLanguage: language,
          }),
        });

        const payload = (await response.json()) as {
          parsed?: ReturnType<typeof parseLabAnalysis>;
          unavailable?: boolean;
        };

        if (cancelled) return;

        if (payload.parsed) {
          setLocalizedParsed(payload.parsed);
        }

        setTranslationUnavailable(Boolean(payload.unavailable));
      } catch (error) {
        console.error("Lab analysis localization failed:", error);
        if (!cancelled) {
          setLocalizedParsed(parseLabAnalysis(result.analysis));
        }
      } finally {
        if (!cancelled) {
          setIsLocalizing(false);
        }
      }
    }

    void loadLocalizedAnalysis();

    return () => {
      cancelled = true;
    };
  }, [language, result.analysis, result.labResultId]);

  const parsed = localizedParsed;

  async function shareAnalysis(audience: "doctor" | "family") {
    if (isSharing) return;

    setIsSharing(true);
    setShareFeedback(null);

    try {
      const context =
        audience === "doctor"
          ? await loadDoctorShareContext()
          : { profile: null, doctorName: "" };

      const { title, text } = buildSharePayload(
        audience,
        buildShareAnalysisText(parsed),
        result.createdAt,
        context,
      );

      if (navigator.share) {
        await navigator.share({ title, text });
        return;
      }

      await navigator.clipboard.writeText(`${title}\n\n${text}`);
      setShareFeedback(t("lab_share_copied"));
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "AbortError" || error.message.includes("Share canceled"))
      ) {
        return;
      }

      setShareFeedback(t("lab_share_failed"));
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-5 py-6">
      <h2 className="text-2xl font-bold text-[#085041]">{t("lab_your_analysis")}</h2>

      {isLocalizing ? (
        <p className="mt-3 text-sm text-muted">{t("lab_translating")}</p>
      ) : null}

      {translationUnavailable ? (
        <p className="mt-3 rounded-xl bg-warning-light px-4 py-3 text-sm text-warning">
          {t("lab_translation_unavailable")}
        </p>
      ) : null}

      {parsed.structured ? (
        <StructuredAnalysisView parsed={parsed} />
      ) : (
        <article className="noor-card mt-4 border-l-4 border-l-primary p-5">
          <div className="analysis-markdown lab-analysis-text">
            <ReactMarkdown>{buildShareAnalysisText(parsed)}</ReactMarkdown>
          </div>
        </article>
      )}

      <p className="mt-5 text-center text-sm text-muted">Erstellt von Noor KI</p>

      {shareFeedback ? (
        <p className="mt-4 text-center text-base text-muted" role="status">
          {shareFeedback}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 pb-2">
        <button
          type="button"
          onClick={() => void shareAnalysis("doctor")}
          disabled={isSharing}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60"
        >
          <Share2 size={20} aria-hidden="true" />
          Mit Hausarzt teilen
        </button>
        <button
          type="button"
          onClick={() => void shareAnalysis("family")}
          disabled={isSharing}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-surface px-5 py-4 text-base font-semibold text-primary transition-colors hover:bg-primary-light active:scale-[0.98] disabled:opacity-60"
        >
          <Share2 size={20} aria-hidden="true" />
          Mit Familie teilen
        </button>
      </div>
      </main>
      <ScrollToTopButton />
    </>
  );
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const scrollContainer = document.querySelector(".app-scroll-main");
    if (!scrollContainer) return;

    const container = scrollContainer;

    function handleScroll() {
      setVisible(container.scrollTop > 300);
    }

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => {
        document.querySelector(".app-scroll-main")?.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }}
      aria-label="Nach oben scrollen"
      className="fixed bottom-20 right-5 z-50 flex size-11 items-center justify-center rounded-full border-0 bg-[#1D9E75] text-xl text-white"
      style={{ boxShadow: "0 4px 12px rgba(29,158,117,0.3)" }}
    >
      ↑
    </button>
  );
}

function StructuredAnalysisView({
  parsed,
}: {
  parsed: ReturnType<typeof parseLabAnalysis>;
}) {
  const { t } = useLanguage();
  const urgent = isDoctorVisitUrgent(parsed.doctorVisit);
  const [activeFilter, setActiveFilter] = useState<LabValueFilterKey>("all");
  const sortedValues = parsed.values;

  function handleFilterChange(filter: LabValueFilterKey) {
    setActiveFilter((current) => (current === filter ? "all" : filter));
  }

  const filteredValues = useMemo(() => {
    if (activeFilter === "all") return sortedValues;

    return sortedValues.filter((value) =>
      matchesLabValueFilter(value, activeFilter),
    );
  }, [activeFilter, sortedValues]);

  return (
    <div className="mt-4 flex flex-col gap-4">
      {parsed.summary ? (
        <section className="rounded-2xl border border-border border-l-4 border-l-[#1D9E75] bg-[#E1F5EE] p-5 shadow-[var(--warm-shadow)]">
          <h3 className="text-lg font-bold text-[#085041]">{t("lab_summary")}</h3>
          <div className="analysis-markdown lab-analysis-text mt-3">
            <ReactMarkdown>{parsed.summary}</ReactMarkdown>
          </div>
        </section>
      ) : null}

      {sortedValues.length > 0 ? (
        <section className="noor-card">
          <h3 className="px-4 pt-4 text-lg font-bold text-[#085041]">
            {t("lab_values_detail")}
          </h3>
          <div
            className="sticky top-0 z-10 border-b-[0.5px] border-[#E4E2DB] bg-white px-4 py-3"
            style={{
              position: "sticky",
              top: 0,
              backgroundColor: "#FFFFFF",
              zIndex: 10,
              padding: "12px 16px",
              borderBottom: "0.5px solid #E4E2DB",
            }}
          >
            <SummaryBar
              activeFilter={activeFilter}
              counts={parsed.counts}
              onFilterChange={handleFilterChange}
            />
          </div>
          <div className="flex flex-col gap-3 p-4 pt-3">
            {filteredValues.length > 0 ? (
              filteredValues.map((value) => (
                <LabValueCard
                  key={`${value.name}-${value.patientValue}`}
                  value={value}
                />
              ))
            ) : (
              <LabValueFilterEmptyState filter={activeFilter} />
            )}
          </div>
        </section>
      ) : null}

      {parsed.nextSteps.length > 0 ? (
        <section className="noor-card p-5">
          <h3 className="text-lg font-bold text-[#085041]">{t("lab_next_steps")}</h3>
          <ol className="mt-4 flex list-none flex-col gap-3">
            {parsed.nextSteps.map((step, index) => (
              <li key={step} className="flex gap-3 text-[17px] leading-relaxed">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-heading">
                  {index + 1}
                </span>
                <span className="pt-0.5 text-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {parsed.lifestylePlan ? (
        <LifestylePlanSection plan={parsed.lifestylePlan} />
      ) : null}

      {parsed.personalGoals.length > 0 ? (
        <PersonalGoalsSection goals={parsed.personalGoals} />
      ) : null}

      {parsed.doctorVisit ? (
        <section
          className={`rounded-2xl border border-border border-l-4 p-5 shadow-[var(--warm-shadow)] ${
            urgent
              ? "border-l-[#BA7517] bg-[#FDF4E7]"
              : "border-l-[#1D9E75] bg-[#E1F5EE]"
          }`}
        >
          <h3 className="text-lg font-bold text-[#085041]">{t("lab_when_doctor")}</h3>
          <div className="analysis-markdown lab-analysis-text mt-3">
            <ReactMarkdown>{parsed.doctorVisit}</ReactMarkdown>
          </div>
        </section>
      ) : null}

      {parsed.disclaimer ? (
        <p className="px-2 text-center text-sm italic text-muted">
          {parsed.disclaimer}
        </p>
      ) : null}
    </div>
  );
}

function LabValueFilterEmptyState({ filter }: { filter: LabValueFilterKey }) {
  const { t } = useLanguage();
  const messages: Record<
    Exclude<LabValueFilterKey, "all">,
    { title: string; subtitle: string }
  > = {
    red: {
      title: t("lab_filter_empty_high_title"),
      subtitle: t("lab_filter_empty_high_subtitle"),
    },
    amber: {
      title: t("lab_filter_empty_watch_title"),
      subtitle: t("lab_filter_empty_watch_subtitle"),
    },
    green: {
      title: t("lab_filter_empty_normal_title"),
      subtitle: "",
    },
  };

  if (filter === "all") return null;

  const content = messages[filter];

  return (
    <div className="py-8 text-center">
      <p className="text-base font-semibold text-foreground">{content.title}</p>
      {content.subtitle ? (
        <p className="mt-2 text-base text-muted">{content.subtitle}</p>
      ) : null}
    </div>
  );
}

function SummaryBar({
  counts,
  activeFilter,
  onFilterChange,
}: {
  counts: { green: number; amber: number; red: number };
  activeFilter: LabValueFilterKey;
  onFilterChange: (filter: LabValueFilterKey) => void;
}) {
  const { t } = useLanguage();
  const items: Array<{
    filter: Exclude<LabValueFilterKey, "all">;
    emoji: string;
    count: number;
    label: string;
    color: string;
  }> = [
    {
      filter: "green",
      emoji: "🟢",
      count: counts.green,
      label: t("lab_status_normal"),
      color: "text-[#1D9E75]",
    },
    {
      filter: "amber",
      emoji: "🟡",
      count: counts.amber,
      label: t("lab_status_watch"),
      color: "text-[#BA7517]",
    },
    {
      filter: "red",
      emoji: "🔴",
      count: counts.red,
      label: t("lab_status_high"),
      color: "text-[#A32D2D]",
    },
  ];

  return (
    <div
      className="flex items-center justify-between gap-2"
      role="group"
      aria-label={t("lab_filter_aria")}
    >
      {items.map((item) => {
        const isActive = activeFilter === item.filter;

        return (
          <button
            key={item.filter}
            type="button"
            onClick={() => onFilterChange(item.filter)}
            aria-pressed={isActive}
            aria-label={t("lab_filter_show", {
              label: item.label,
              count: item.count,
            })}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-1 text-center transition-all duration-150 ease-in-out hover:bg-background/70"
          >
            <span
              className="inline-flex items-center justify-center rounded-full text-2xl transition-all duration-150 ease-in-out"
              style={{
                border: isActive ? "3px solid #085041" : "3px solid transparent",
                transform: isActive ? "scale(1.15)" : "scale(1)",
              }}
              aria-hidden="true"
            >
              {item.emoji}
            </span>
            <span className={`text-xl font-bold ${item.color}`}>{item.count}</span>
            <span className="text-sm font-semibold text-muted">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function PersonalGoalsSection({ goals }: { goals: PersonalGoal[] }) {
  const { t } = useLanguage();

  return (
    <section className="noor-card p-5">
      <h3 className="text-lg font-bold text-[#085041]">
        {t("lab_personal_goals")}
      </h3>
      <p className="text-body mt-2 text-muted">
        {t("lab_personal_goals_intro")}
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {goals.map((goal) => (
          <div
            key={`${goal.emoji}-${goal.name}`}
            className="rounded-2xl border border-border bg-background p-4"
          >
            <h4 className="text-base font-bold text-heading">
              <span aria-hidden="true">{goal.emoji} </span>
              {goal.name}
            </h4>
            <p className="text-body mt-2 leading-relaxed text-foreground">
              <span className="font-semibold text-heading">{t("lab_your_goal")} </span>
              {goal.target}
            </p>
            {goal.why ? (
              <p className="text-body mt-2 leading-relaxed text-foreground">
                <span className="font-semibold text-heading">{t("lab_why")} </span>
                {goal.why}
              </p>
            ) : null}
            {goal.current ? (
              <p className="text-body mt-2 leading-relaxed text-muted">
                <span className="font-semibold text-heading">{t("lab_current")} </span>
                {goal.current}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function LifestylePlanSection({ plan }: { plan: LifestylePlan }) {
  const { t } = useLanguage();
  const items = [
    { emoji: "🥗", title: t("lab_lifestyle_nutrition"), content: plan.nutrition },
    { emoji: "🚶", title: t("lab_lifestyle_exercise"), content: plan.exercise },
    { emoji: "💧", title: t("lab_lifestyle_hydration"), content: plan.hydration },
    {
      emoji: "📅",
      title: t("lab_lifestyle_next_checkup"),
      content: plan.nextCheckup,
    },
  ].filter((item) => item.content);

  if (items.length === 0) return null;

  return (
    <section className="noor-card p-5">
      <h3 className="text-lg font-bold text-[#085041]">
        {t("lab_lifestyle_plan")}
      </h3>
      <p className="text-body mt-2 text-muted">{t("lab_lifestyle_intro")}</p>
      <div className="mt-4 flex flex-col gap-4">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-border bg-background p-4"
          >
            <h4 className="text-base font-bold text-heading">
              <span aria-hidden="true">{item.emoji} </span>
              {item.title}
            </h4>
            <p className="text-body mt-2 whitespace-pre-wrap leading-relaxed text-foreground">
              {item.content}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LabValueCard({ value }: { value: ParsedLabValue }) {
  const { t } = useLanguage();

  return (
    <article
      className={`noor-card border-l-4 bg-surface p-4 ${BORDER_BY_LEVEL[value.level]}`}
    >
      <h4 className="lab-value-name font-bold text-[#085041]">{value.name}</h4>

      {(value.patientValue || value.referenceRange) && (
        <p className="mt-2 text-sm text-muted">
          {value.patientValue ? (
            <>
              <span className="font-semibold">{t("lab_your_value")}</span>{" "}
              {value.patientValue}
            </>
          ) : null}
          {value.patientValue && value.referenceRange ? (
            <span className="mx-2 text-muted/70">—</span>
          ) : null}
          {value.referenceRange ? (
            <>
              <span className="font-semibold">{t("lab_normal_range")}</span>{" "}
              {value.referenceRange}
            </>
          ) : null}
        </p>
      )}

      {value.meaning ? (
        <p className="lab-analysis-text lab-value-explanation mt-3 text-foreground">
          <span className="font-semibold text-heading">{t("lab_what_means")} </span>
          {value.meaning}
        </p>
      ) : null}

      {value.status ? (
        <span
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass(value.status, value.level)}`}
        >
          {translateLabStatusLabel(value.status, t)}
        </span>
      ) : null}

      {value.tip ? (
        <p className="lab-analysis-text lab-value-explanation mt-3 flex gap-2 text-foreground">
          <span aria-hidden="true">💡</span>
          <span>
            <span className="font-semibold text-heading">{t("lab_tip")} </span>
            {value.tip}
          </span>
        </p>
      ) : null}
    </article>
  );
}
