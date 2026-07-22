import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ParsedHealthGoalNumbers,
  PersonalGoal,
} from "@/types/health-goals";

const GOALS_VALID_DAYS = 90;

function parseGermanNumber(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractField(block: string, label: string) {
  const match = block.match(new RegExp(`${label}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() ?? "";
}

function extractGoalBlock(section: string, emoji: string, namePattern: RegExp) {
  const blocks = section.split(/\n(?=[🎯💧🥩😴])/u).map((block) => block.trim());

  return blocks.find(
    (block) => block.startsWith(emoji) && namePattern.test(block),
  );
}

export function parsePersonalGoalsSection(section: string): PersonalGoal[] {
  if (!section.trim()) return [];

  const definitions: Array<{
    emoji: string;
    namePattern: RegExp;
    defaultName: string;
  }> = [
    { emoji: "🎯", namePattern: /schritt/i, defaultName: "Schritte pro Tag" },
    { emoji: "💧", namePattern: /wasser/i, defaultName: "Wasser pro Tag" },
    { emoji: "🥩", namePattern: /protein/i, defaultName: "Protein pro Tag" },
    { emoji: "😴", namePattern: /schlaf/i, defaultName: "Schlaf pro Nacht" },
  ];

  return definitions
    .map(({ emoji, namePattern, defaultName }) => {
      const block = extractGoalBlock(section, emoji, namePattern);
      if (!block) return null;

      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const header = lines[0] ?? "";
      const name =
        header.replace(/^[^\s]+\s*/, "").trim() ||
        defaultName;

      const target = extractField(block, "Ihr Ziel");
      const why = extractField(block, "Warum");
      const current = extractField(block, "Aktuell");

      if (!target) return null;

      const goal: PersonalGoal = {
        emoji,
        name,
        target,
        why,
      };

      if (current) {
        goal.current = current;
      }

      return goal;
    })
    .filter((goal): goal is PersonalGoal => goal !== null);
}

export function extractHealthGoalNumbers(
  section: string,
  goals: PersonalGoal[],
): ParsedHealthGoalNumbers {
  const stepsBlock =
    goals.find((goal) => /schritt/i.test(goal.name))?.target ??
    extractField(section, "Ihr Ziel");
  const waterBlock = goals.find((goal) => /wasser/i.test(goal.name))?.target;
  const proteinBlock = goals.find((goal) => /protein/i.test(goal.name))?.target;
  const sleepBlock = goals.find((goal) => /schlaf/i.test(goal.name))?.target;

  const stepsMatch = (stepsBlock ?? section).match(
    /([\d.,]+)\s*Schritte/i,
  );
  const waterMatch = (waterBlock ?? section).match(
    /([\d.,]+)\s*(?:Liter|L)\b/i,
  );
  const proteinMatch = (proteinBlock ?? section).match(
    /([\d.,]+)\s*(?:g|Gramm)\b/i,
  );
  const sleepMatch = (sleepBlock ?? section).match(
    /([\d.,]+)\s*(?:-|–|bis)\s*([\d.,]+)\s*Stunden/i,
  );
  const sleepSingleMatch = (sleepBlock ?? section).match(
    /([\d.,]+)\s*Stunden/i,
  );

  const sleepHoursMin = sleepMatch
    ? Math.round(parseGermanNumber(sleepMatch[1]) ?? 0)
    : sleepSingleMatch
      ? Math.round(parseGermanNumber(sleepSingleMatch[1]) ?? 0)
      : null;
  const sleepHoursMax = sleepMatch
    ? Math.round(parseGermanNumber(sleepMatch[2]) ?? 0)
    : sleepHoursMin;

  return {
    stepsGoal: stepsMatch
      ? Math.round(parseGermanNumber(stepsMatch[1]) ?? 0)
      : null,
    waterGoalLiters: waterMatch
      ? parseGermanNumber(waterMatch[1])
      : null,
    proteinGoalGrams: proteinMatch
      ? Math.round(parseGermanNumber(proteinMatch[1]) ?? 0)
      : null,
    sleepHoursMin,
    sleepHoursMax,
  };
}

export function hasAnyHealthGoalNumbers(numbers: ParsedHealthGoalNumbers) {
  return (
    numbers.stepsGoal != null ||
    numbers.waterGoalLiters != null ||
    numbers.proteinGoalGrams != null ||
    numbers.sleepHoursMin != null
  );
}

export async function saveHealthGoalsFromAnalysis(
  supabase: SupabaseClient,
  options: {
    userId: string;
    labResultId: string;
    personalGoalsSection: string;
    goals: PersonalGoal[];
  },
) {
  const numbers = extractHealthGoalNumbers(
    options.personalGoalsSection,
    options.goals,
  );

  if (!hasAnyHealthGoalNumbers(numbers)) {
    return { saved: false as const, numbers };
  }

  const validUntil = new Date();
  validUntil.setUTCDate(validUntil.getUTCDate() + GOALS_VALID_DAYS);

  const { error } = await supabase.from("health_goals").insert({
    user_id: options.userId,
    lab_result_id: options.labResultId,
    steps_goal: numbers.stepsGoal,
    water_goal_liters: numbers.waterGoalLiters,
    protein_goal_grams: numbers.proteinGoalGrams,
    sleep_hours_min: numbers.sleepHoursMin,
    sleep_hours_max: numbers.sleepHoursMax,
    valid_until: validUntil.toISOString(),
  });

  if (error) {
    console.error("Health goals save failed", error);
    return { saved: false as const, numbers, error };
  }

  return { saved: true as const, numbers };
}
