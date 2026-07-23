type TranslateFn = (key: string) => string;

export function translateLabStatusLabel(status: string, t: TranslateFn) {
  const normalized = status.trim().toLowerCase();

  if (
    normalized.includes("erhöht") ||
    normalized.includes("erhoht") ||
    normalized.includes("elevated") ||
    normalized.includes("high")
  ) {
    return t("lab_status_high");
  }

  if (
    normalized.includes("erniedrigt") ||
    normalized.includes("low") ||
    normalized.includes("niedrig")
  ) {
    return t("lab_status_low");
  }

  if (
    normalized.includes("beachten") ||
    normalized.includes("watch") ||
    normalized.includes("auffällig")
  ) {
    return t("lab_status_watch");
  }

  if (normalized.includes("normal")) {
    return t("lab_status_normal");
  }

  return status;
}
