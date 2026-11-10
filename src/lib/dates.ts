/** Convert a Date to a local-time ISO calendar date (YYYY-MM-DD). */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromISODate(iso: string): Date {
  const [year = 1970, month = 1, day = 1] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function compareISODate(a: string, b: string): number {
  return a.localeCompare(b);
}

export function startOfMonthISO(iso: string): string {
  const date = fromISODate(iso);
  return toISODate(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function addMonthsISO(iso: string, months: number): string {
  const date = fromISODate(iso);
  return toISODate(new Date(date.getFullYear(), date.getMonth() + months, 1));
}

/** Monday-based weekday index: Monday = 0 … Sunday = 6. */
export function mondayIndex(iso: string): number {
  return (fromISODate(iso).getDay() + 6) % 7;
}

/** 42-cell month grid (6 rows) starting on the Monday of the month's first week. */
export function monthGridDates(iso: string): string[] {
  const first = startOfMonthISO(iso);
  const gridStart = addDaysISO(first, -mondayIndex(first));
  return Array.from({ length: 42 }, (_, index) => addDaysISO(gridStart, index));
}

export function isSameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function rollingWeek(iso: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysISO(iso, index));
}

export function isOverdue(dueDate: string | null, status?: string): boolean {
  if (!dueDate) return false;
  if (status === 'done' || status === 'cancelled') return false;
  return dueDate < todayISO();
}

export function daysBetween(fromISO: string, toISO: string): number {
  const from = fromISODate(fromISO).getTime();
  const to = fromISODate(toISO).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

export function formatISODate(
  iso: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
): string {
  return new Intl.DateTimeFormat(locale, options).format(fromISODate(iso));
}

export function formatWeekday(iso: string, locale: string): string {
  return formatISODate(iso, locale, { weekday: 'short' });
}

export function formatLongDate(iso: string, locale: string): string {
  return formatISODate(iso, locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatMonthYear(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

export function relativeDueLabel(iso: string, locale: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const days = daysBetween(todayISO(), iso);
  if (days === 0) return t('dates.today');
  if (days === 1) return t('dates.tomorrow');
  if (days === -1) return t('dates.yesterday');
  if (days > 1 && days <= 6) return t('dates.inDays', { count: days });
  if (days < -1) return t('dates.daysAgo', { count: Math.abs(days) });
  return formatISODate(iso, locale);
}
