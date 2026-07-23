import type { PersonalGoal } from "@/types/health-goals";
import { parsePersonalGoalsSection } from "@/lib/health-goals";
import type { AppLanguage } from "@/lib/i18n/languages";

export type AnalysisLanguage = AppLanguage;

export type LabValueLevel = "green" | "amber" | "red";

export type LabValueStatusKey = "high" | "low" | "watch" | "normal" | "unknown";

export type ParsedLabValue = {
  level: LabValueLevel;
  name: string;
  patientValue: string;
  referenceRange: string;
  meaning: string;
  status: string;
  tip?: string;
};

export type LifestylePlan = {
  nutrition: string;
  exercise: string;
  hydration: string;
  nextCheckup: string;
};

export type ParsedLabAnalysis = {
  structured: boolean;
  summary: string;
  values: ParsedLabValue[];
  nextSteps: string[];
  lifestylePlan: LifestylePlan | null;
  personalGoals: PersonalGoal[];
  personalGoalsSection: string;
  doctorVisit: string;
  disclaimer: string;
  counts: {
    green: number;
    amber: number;
    red: number;
  };
};

const SECTION_ALIASES = {
  summary: [
    "ZUSAMMENFASSUNG",
    "SUMMARY",
    "ÖZET",
    "PËRMBLEDHJE",
  ],
  values: [
    "IHRE LABORWERTE IM DETAIL",
    "LABORWERTE IM DETAIL",
    "YOUR LAB VALUES IN DETAIL",
    "YOUR LABORATORY VALUES IN DETAIL",
    "LABORATUVAR DEĞERLERİNİZ AYRINTILI",
    "LABORATUVAR DEĞERLERİNİZ",
    "VLERAT TUaja LABORATORIKE NË DETAJE",
  ],
  nextSteps: [
    "NÄCHSTE SCHRITTE",
    "NEXT STEPS",
    "SONRAKI ADIMLAR",
    "HAPAT E ARDHSHËM",
  ],
  lifestyle: [
    "IHR PERSÖNLICHER LEBENSSTIL-PLAN",
    "YOUR PERSONAL LIFESTYLE PLAN",
    "KİŞİSEL YAŞAM TARZI PLANINIZ",
    "PLANI JUAJ PERSONAL I STILIT TË JETËS",
  ],
  goals: [
    "IHRE PERSÖNLICHEN TAGESZIELE",
    "YOUR PERSONAL DAILY GOALS",
    "KİŞİSEL GÜNLÜK HEDEFLERİNİZ",
    "OBJEKTIVAT TUaja PERSONALE DITORE",
  ],
  doctor: [
    "WANN ZUM ARZT",
    "WHEN TO SEE A DOCTOR",
    "NE ZAMAN DOKTORA",
    "KUR TË SHKONI TE MJEKU",
  ],
} as const;

const LIFESTYLE_SUBSECTION_ALIASES = {
  nutrition: ["ERNÄHRUNG", "NUTRITION", "BESLENME", "USHQIMI"],
  exercise: ["BEWEGUNG", "EXERCISE", "HAREKET", "LËVIZJA"],
  hydration: ["TRINKEN", "HYDRATION", "SU", "UJI"],
  nextCheckup: [
    "NÄCHSTE KONTROLLE",
    "NEXT CHECK-UP",
    "NEXT CHECKUP",
    "SONRAKI KONTROL",
    "KONTROLLI I ARDHSHËM",
  ],
} as const;

const LIFESTYLE_SUBSECTION_MARKERS = Object.values(LIFESTYLE_SUBSECTION_ALIASES)
  .flat()
  .join("|");

const PATIENT_VALUE_LABEL =
  /^(?:Ihr Wert|Your value|Değeriniz|Vlera juaj)\s*:/i;
const REFERENCE_RANGE_LABEL =
  /^(?:Normalbereich|Normal range|Normal aralık|Diapazoni normal)\s*:/i;
const MEANING_LABEL =
  /^(?:Was bedeutet das|What (?:this|does this) means?|Ne anlama geliyor|Çfarë do të thotë)\s*:/i;
const STATUS_LABEL = /^Status\s*:/i;

export function detectAnalysisLanguage(
  text: string,
  stored?: string | null,
): AnalysisLanguage {
  if (
    stored === "de" ||
    stored === "en" ||
    stored === "tr" ||
    stored === "sq"
  ) {
    return stored;
  }

  const sample = text.slice(0, 1200).toLowerCase();

  const germanHits = (
    sample.match(
      /\b(zusammenfassung|ihr wert|normalbereich|was bedeutet das|nächste schritte|laborwerte)\b/g,
    ) ?? []
  ).length;
  const englishHits = (
    sample.match(
      /\b(summary|your value|normal range|what this means|next steps|lab values)\b/g,
    ) ?? []
  ).length;
  const turkishHits = (
    sample.match(
      /\b(özet|değeriniz|normal aralık|ne anlama geliyor|sonraki adımlar|laboratuvar)\b/g,
    ) ?? []
  ).length;
  const albanianHits = (
    sample.match(
      /\b(përmbledhje|vlera juaj|diapazoni normal|çfarë do të thotë|hapat e ardhshëm|laboratorike)\b/g,
    ) ?? []
  ).length;

  const scores: Array<[AnalysisLanguage, number]> = [
    ["de", germanHits],
    ["en", englishHits],
    ["tr", turkishHits],
    ["sq", albanianHits],
  ];

  scores.sort((left, right) => right[1] - left[1]);
  if (scores[0][1] > 0) {
    return scores[0][0];
  }

  return "de";
}

const EMOJI_LEVEL: Record<string, LabValueLevel> = {
  "🟢": "green",
  "🟡": "amber",
  "🔴": "red",
};

const priorityOrder: Record<LabValueStatusKey, number> = {
  high: 0,
  low: 0,
  watch: 1,
  normal: 2,
  unknown: 3,
};

export function getLabValueStatusKey(value: ParsedLabValue): LabValueStatusKey {
  const normalized = value.status.toLowerCase();

  if (
    value.level === "red" ||
    (/erniedrigt|erhöht|elevated|high|low|düşük|i ulët|i lartë|yüksek|niedrig/.test(
      normalized,
    ) &&
      !/leicht|slightly|hafif|lehtë/.test(normalized))
  ) {
    if (/erniedrigt|low|düşük|i ulët|niedrig/.test(normalized)) return "low";
    if (/erhöht|elevated|high|yüksek|i lartë/.test(normalized)) return "high";
    return "high";
  }

  if (
    value.level === "amber" ||
    /leicht|beacht|watch|attention|dikkat|vëmendje|auffällig/.test(normalized)
  ) {
    return "watch";
  }

  if (value.level === "green" || /normal/.test(normalized)) {
    return "normal";
  }

  return "unknown";
}

export function sortLabValuesByPriority(values: ParsedLabValue[]) {
  return [...values].sort(
    (left, right) =>
      (priorityOrder[getLabValueStatusKey(left)] ?? 3) -
      (priorityOrder[getLabValueStatusKey(right)] ?? 3),
  );
}

/** Removes inline markdown symbols (**bold**, *italic*, `code`, leading bullets). */
export function stripInlineMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^[\s]*[-•*]\s+/, "")
    .trim();
}

export function parseLabAnalysis(text: string): ParsedLabAnalysis {
  const sections = splitSections(text);
  const summary = extractSectionByAliases(sections, SECTION_ALIASES.summary);
  const valuesSection = extractSectionByAliases(sections, SECTION_ALIASES.values);
  const values = sortLabValuesByPriority(parseLabValues(valuesSection));
  const nextSteps = parseListItems(
    extractSectionByAliases(sections, SECTION_ALIASES.nextSteps),
  );
  const lifestylePlan = parseLifestylePlan(
    extractSectionByAliases(sections, SECTION_ALIASES.lifestyle),
  );
  const personalGoalsSection = extractSectionByAliases(
    sections,
    SECTION_ALIASES.goals,
  );
  const personalGoals = parsePersonalGoalsSection(personalGoalsSection);
  const doctorVisit = extractSectionByAliases(sections, SECTION_ALIASES.doctor);
  const disclaimer =
    extractDisclaimer(sections) ||
    "Diese Erklärung ersetzt keine ärztliche Beratung.";

  const counts = values.reduce(
    (acc, value) => {
      acc[value.level] += 1;
      return acc;
    },
    { green: 0, amber: 0, red: 0 },
  );

  const structured =
    Boolean(summary || values.length > 0 || nextSteps.length > 0) &&
    values.length > 0;

  return {
    structured,
    summary: summary || text.trim(),
    values,
    nextSteps,
    lifestylePlan,
    personalGoals,
    personalGoalsSection,
    doctorVisit,
    disclaimer,
    counts,
  };
}

export type LabAnalysisCounts = {
  normal: number;
  watch: number;
  high: number;
};

export type LabResultStatusDisplay =
  | { mode: "pills"; counts: LabAnalysisCounts }
  | { mode: "tap" };

export function getLabResultStatusDisplay(result: {
  ai_analysis?: string | null;
  normal_count?: number | null;
  watch_count?: number | null;
  high_count?: number | null;
}): LabResultStatusDisplay {
  const hasSavedCounts =
    result.normal_count != null ||
    result.watch_count != null ||
    result.high_count != null;

  if (hasSavedCounts) {
    return {
      mode: "pills",
      counts: {
        normal: result.normal_count ?? 0,
        watch: result.watch_count ?? 0,
        high: result.high_count ?? 0,
      },
    };
  }

  const text = result.ai_analysis?.trim() ?? "";
  if (text) {
    const normal = (text.match(/🟢/g) || []).length;
    const watch = (text.match(/🟡/g) || []).length;
    const high = (text.match(/🔴/g) || []).length;

    if (normal + watch + high > 0) {
      return { mode: "pills", counts: { normal, watch, high } };
    }
  }

  return { mode: "tap" };
}

export function getLabAnalysisCounts(
  text: string,
  stored?: {
    normal_count?: number | null;
    watch_count?: number | null;
    high_count?: number | null;
  },
): LabAnalysisCounts {
  const hasStoredCounts =
    typeof stored?.normal_count === "number" &&
    typeof stored?.watch_count === "number" &&
    typeof stored?.high_count === "number";

  if (hasStoredCounts) {
    const normal = stored!.normal_count!;
    const watch = stored!.watch_count!;
    const high = stored!.high_count!;

    if (normal + watch + high > 0) {
      return { normal, watch, high };
    }
  }

  const parsed = parseLabAnalysis(text);

  if (parsed.structured && parsed.values.length > 0) {
    return {
      normal: parsed.counts.green,
      watch: parsed.counts.amber,
      high: parsed.counts.red,
    };
  }

  return {
    normal: (text.match(/🟢/g) || []).length,
    watch: (text.match(/🟡/g) || []).length,
    high: (text.match(/🔴/g) || []).length,
  };
}

export function isDoctorVisitUrgent(text: string) {
  const normalized = text.toLowerCase();

  return /dringend|sofort|umgehend|nicht warten|zeitnah|bald(ig)?|schnellstmöglich|heute|morgen|notfall|dringlich|urgent|immediately|as soon as possible|today|tomorrow|emergency|acil|hemen|derhal|sot|nesër|urgjent/.test(
    normalized,
  );
}

function extractSectionByAliases(
  sections: string[],
  aliases: readonly string[],
) {
  for (const alias of aliases) {
    const content = extractSection(sections, alias);
    if (content) return content;
  }

  return "";
}

function splitSections(text: string) {
  return text
    .split(/\n-{3,}\n?|\n---\n?|^---\n?/m)
    .map((part) => part.trim())
    .map((part) =>
      part
        .replace(/^#{1,6}\s*/, "")
        .replace(/^\*\*(.+?)\*\*/, "$1"),
    )
    .filter(Boolean);
}

function extractSection(sections: string[], marker: string) {
  const match = sections.find((section) =>
    section.toUpperCase().startsWith(marker),
  );

  if (!match) return "";

  return match
    .replace(new RegExp(`^${marker}\\s*`, "i"), "")
    .trim();
}

function extractDisclaimer(sections: string[]) {
  const match = sections.find(
    (section) =>
      section.includes("⚕️") ||
      /ärztliche beratung|medical advice|tıbbi tavsiye|këshillë mjekësore/i.test(
        section,
      ) ||
      /ersetzt keine|does not replace|doesn't replace|yerine geçmez|nuk zëvendëson/i.test(
        section,
      ),
  );

  return match?.replace(/^⚕️\s*/, "").trim() ?? "";
}

function parseLabValues(section: string): ParsedLabValue[] {
  if (!section) return [];

  const blocks = section
    .split(/\n(?=(?:\*{1,2}|#{1,6}\s*|[-•]\s*)?[🟢🟡🔴])/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map(parseLabValueBlock)
    .filter((value): value is ParsedLabValue => value !== null);
}

function parseLabValueBlock(block: string): ParsedLabValue | null {
  const lines = block
    .split("\n")
    .map((line) => stripInlineMarkdown(line))
    .filter(Boolean);
  if (lines.length === 0) return null;

  const header = lines[0];
  const level = detectEmojiLevel(header);
  const name = extractValueName(header);

  if (!name) return null;

  let patientValue = "";
  let referenceRange = "";
  let meaning = "";
  let status = "";
  const tipLines: string[] = [];
  let currentField: "meaning" | null = null;

  for (const line of lines.slice(1)) {
    if (PATIENT_VALUE_LABEL.test(line)) {
      patientValue = line.replace(PATIENT_VALUE_LABEL, "").trim();
      currentField = null;
      continue;
    }

    if (REFERENCE_RANGE_LABEL.test(line)) {
      referenceRange = line.replace(REFERENCE_RANGE_LABEL, "").trim();
      currentField = null;
      continue;
    }

    if (MEANING_LABEL.test(line)) {
      meaning = line.replace(MEANING_LABEL, "").trim();
      currentField = "meaning";
      continue;
    }

    if (STATUS_LABEL.test(line)) {
      status = line.replace(STATUS_LABEL, "").trim();
      currentField = null;
      continue;
    }

    if (currentField === "meaning") {
      meaning = `${meaning} ${line}`.trim();
      continue;
    }

    if (status) {
      tipLines.push(line);
    }
  }

  return {
    level,
    name: stripInlineMarkdown(name),
    patientValue: stripInlineMarkdown(patientValue),
    referenceRange: stripInlineMarkdown(referenceRange),
    meaning: stripInlineMarkdown(meaning),
    status: stripInlineMarkdown(status),
    tip:
      tipLines.length > 0
        ? stripInlineMarkdown(tipLines.join(" "))
        : undefined,
  };
}

function detectEmojiLevel(header: string): LabValueLevel {
  if (header.includes("🔴")) return "red";
  if (header.includes("🟡")) return "amber";
  return "green";
}

function extractValueName(header: string) {
  return header
    .replace(/^[🟢🟡🔴]\s*/u, "")
    .replace(/(?:\/\s*[🟢🟡🔴]\s*)+/gu, "")
    .replace(/^[\s\-–—]+/, "")
    .trim();
}

function parseListItems(section: string) {
  if (!section) return [];

  return section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      stripInlineMarkdown(
        line.replace(/^\d+[\).\]]\s*/, "").replace(/^[-•*]\s+/, ""),
      ),
    )
    .filter(Boolean);
}

function parseLifestylePlan(section: string): LifestylePlan | null {
  if (!section.trim()) return null;

  const plan = {
    nutrition: extractLifestyleSubsection(
      section,
      LIFESTYLE_SUBSECTION_ALIASES.nutrition,
    ),
    exercise: extractLifestyleSubsection(
      section,
      LIFESTYLE_SUBSECTION_ALIASES.exercise,
    ),
    hydration: extractLifestyleSubsection(
      section,
      LIFESTYLE_SUBSECTION_ALIASES.hydration,
    ),
    nextCheckup: extractLifestyleSubsection(
      section,
      LIFESTYLE_SUBSECTION_ALIASES.nextCheckup,
    ),
  };

  if (!plan.nutrition && !plan.exercise && !plan.hydration && !plan.nextCheckup) {
    return null;
  }

  return plan;
}

function extractLifestyleSubsection(
  section: string,
  markers: readonly string[],
) {
  for (const marker of markers) {
    const pattern = new RegExp(
      `(?:^|\\n)${marker}[^\\n]*\\n([\\s\\S]*?)(?=\\n(?:${LIFESTYLE_SUBSECTION_MARKERS})\\b|$)`,
      "i",
    );
    const match = section.match(pattern);

    if (match?.[1]) {
      return stripInlineMarkdown(match[1].trim());
    }
  }

  return "";
}

export function statusBadgeClass(status: string, level: LabValueLevel) {
  const normalized = status.toLowerCase();

  if (
    level === "red" ||
    (/erniedrigt|erhöht/.test(normalized) && !/leicht/.test(normalized))
  ) {
    return "bg-danger-light text-danger";
  }

  if (level === "amber" || /leicht|beacht/.test(normalized)) {
    return "bg-warning-light text-warning";
  }

  return "bg-primary-light text-heading";
}
