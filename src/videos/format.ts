const UNIT_MS = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
  month: 2_592_000_000,
  year: 31_536_000_000,
} as const;
type Unit = keyof typeof UNIT_MS;

const UNIT_WORDS: [RegExp, Unit][] = [
  [/^(m|mins?|minutes?)$/, "minute"],
  [/^(h|hrs?|hours?)$/, "hour"],
  [/^(d|days?)$/, "day"],
  [/^(w|wks?|weeks?)$/, "week"],
  [/^(mo|months?)$/, "month"],
  [/^(y|yrs?|years?)$/, "year"],
];

export function parseDuration(value: string | null): number | null {
  if (!value || !/^\d+(:\d+)+$/.test(value)) return null;
  return value.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
}

// YouTube only gives relative ages, written as "3y ago", "6 years ago" or "Streamed 2 weeks ago".
export function parsePublished(value: string, now = Date.now()): number | null {
  const [, count, word = ""] = value.match(/(\d+)\s*([a-z]+)\s+ago/i) ?? [];
  const unit = UNIT_WORDS.find(([re]) => re.test(word.toLowerCase()))?.[1];
  return count && unit ? now - Number(count) * UNIT_MS[unit] : null;
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "narrow" });
const LARGEST_FIRST = (Object.entries(UNIT_MS) as [Unit, number][]).reverse();

export function formatAge(publishedAt: number, now = Date.now()): string {
  const elapsed = now - publishedAt;
  const [unit, ms] = LARGEST_FIRST.find(([, ms]) => elapsed >= ms) ?? ["minute", UNIT_MS.minute];
  return relative.format(-Math.max(1, Math.round(elapsed / ms)), unit);
}
