/** businessHours: [{ day: 0-6 (Sun-Sat), open: "10:00", close: "20:00" }] in the store's timezone. */
export function isOpenNow(hours: unknown, timeZone: string, now = new Date()): boolean | null {
  if (!Array.isArray(hours) || hours.length === 0) return null;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.find((p) => p.type === 'weekday')!.value);
  const hhmm = `${parts.find((p) => p.type === 'hour')!.value}:${parts.find((p) => p.type === 'minute')!.value}`;
  return hours.some((h: { day?: number; open?: string; close?: string }) => h?.day === wd && !!h.open && !!h.close && h.open <= hhmm && hhmm < h.close);
}
