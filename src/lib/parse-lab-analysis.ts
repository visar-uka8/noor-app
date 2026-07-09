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
  doctorVisit: string;
  disclaimer: string;
  counts: {
    green: number;
    amber: number;
    red: number;
  };
};

const SECTION_MARKERS = [
  "ZUSAMMENFASSUNG",
  "IHRE LABORWERTE IM DETAIL",
  "LABORWERTE IM DETAIL",
  "NÄCHSTE SCHRITTE",
  "IHR PERSÖNLICHER LEBENSSTIL-PLAN",
  "WANN ZUM ARZT",
] as const;

const LIFESTYLE_SUBSECTION_MARKERS = [
  "ERNÄHRUNG",
  "BEWEGUNG",
  "TRINKEN",
  "NÄCHSTE KONTROLLE",
] as const;

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
    (/erniedrigt|erhöht/.test(normalized) && !/leicht/.test(normalized))
  ) {
    if (/erniedrigt/.test(normalized)) return "low";
    if (/erhöht/.test(normalized)) return "high";
    return "high";
  }

  if (value.level === "amber" || /leicht|beacht/.test(normalized)) {
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
  const summary = extractSection(sections, "ZUSAMMENFASSUNG");
  const valuesSection =
    extractSection(sections, "IHRE LABORWERTE IM DETAIL") ||
    extractSection(sections, "LABORWERTE IM DETAIL");
  const values = sortLabValuesByPriority(parseLabValues(valuesSection));
  const nextSteps = parseListItems(
    extractSection(sections, "NÄCHSTE SCHRITTE"),
  );
  const lifestylePlan = parseLifestylePlan(
    extractSection(sections, "IHR PERSÖNLICHER LEBENSSTIL-PLAN"),
  );
  const doctorVisit = extractSection(sections, "WANN ZUM ARZT");
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
    doctorVisit,
    disclaimer,
    counts,
  };
}

export function isDoctorVisitUrgent(text: string) {
  const normalized = text.toLowerCase();

  return /dringend|sofort|umgehend|nicht warten|zeitnah|bald(ig)?|schnellstmöglich|heute|morgen|notfall|dringlich/.test(
    normalized,
  );
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
      /ärztliche beratung/i.test(section) ||
      /ersetzt keine/i.test(section),
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
    if (line.startsWith("Ihr Wert:")) {
      patientValue = line.replace(/^Ihr Wert:\s*/i, "").trim();
      currentField = null;
      continue;
    }

    if (line.startsWith("Normalbereich:")) {
      referenceRange = line.replace(/^Normalbereich:\s*/i, "").trim();
      currentField = null;
      continue;
    }

    if (line.startsWith("Was bedeutet das:")) {
      meaning = line.replace(/^Was bedeutet das:\s*/i, "").trim();
      currentField = "meaning";
      continue;
    }

    if (line.startsWith("Status:")) {
      status = line.replace(/^Status:\s*/i, "").trim();
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
    nutrition: extractLifestyleSubsection(section, "ERNÄHRUNG"),
    exercise: extractLifestyleSubsection(section, "BEWEGUNG"),
    hydration: extractLifestyleSubsection(section, "TRINKEN"),
    nextCheckup: extractLifestyleSubsection(section, "NÄCHSTE KONTROLLE"),
  };

  if (!plan.nutrition && !plan.exercise && !plan.hydration && !plan.nextCheckup) {
    return null;
  }

  return plan;
}

function extractLifestyleSubsection(section: string, marker: string) {
  const pattern = new RegExp(
    `(?:^|\\n)${marker}[^\\n]*\\n([\\s\\S]*?)(?=\\n(?:${LIFESTYLE_SUBSECTION_MARKERS.join("|")})\\b|$)`,
    "i",
  );
  const match = section.match(pattern);

  if (!match?.[1]) return "";

  return stripInlineMarkdown(match[1].trim());
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
