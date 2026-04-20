export const LEVELS = ["N5", "N4", "N3", "N2", "N1"];

export const EXAMPLE_LEVELS = new Set(["N2", "N1"]);

export function levelRank(level) {
  const index = LEVELS.indexOf(level);
  return index === -1 ? Number.POSITIVE_INFINITY : index + 1;
}

export function normalizeListArg(value, fallback) {
  if (value === undefined || value === null || value === false) {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => String(item).split(",")).map((item) => item.trim()).filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
