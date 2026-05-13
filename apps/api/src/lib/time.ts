// Korea Standard Time is UTC+9 and observes no DST, so the boundary math
// is a fixed offset — no Intl/timezone DB needed.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function kstDayStartMs(now: number = Date.now()): number {
  const kstNow = now + KST_OFFSET_MS;
  const kstMidnight = Math.floor(kstNow / DAY_MS) * DAY_MS;
  return kstMidnight - KST_OFFSET_MS;
}

export function kstNextDayStartMs(now: number = Date.now()): number {
  return kstDayStartMs(now) + DAY_MS;
}
