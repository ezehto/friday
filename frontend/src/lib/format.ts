const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function formatNumber(n: number): string {
  return Number.isFinite(n) ? compact.format(n) : "-";
}

export function formatTime(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone });
}

const DAY_MS = 24 * 60 * 60 * 1000;

// An unparseable date is not reported as stale: there is nothing to compare.
export function isStale(asOf: string, now: string): boolean {
  const diff = Date.parse(now) - Date.parse(asOf);
  return Number.isFinite(diff) && diff > DAY_MS;
}
