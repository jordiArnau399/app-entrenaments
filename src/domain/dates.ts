export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 0 dilluns … 6 diumenge */
export function weekdayMonday0(iso: string): number {
  return (parseISODate(iso).getDay() + 6) % 7;
}

export function addDays(iso: string, days: number): string {
  const dt = parseISODate(iso);
  dt.setDate(dt.getDate() + days);
  return formatISODate(dt);
}

export function weekStart(iso: string): string {
  return addDays(iso, -weekdayMonday0(iso));
}

export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function todayIso(now = new Date()): string {
  return formatISODate(now);
}

const MONTHS = [
  'gener',
  'febrer',
  'març',
  'abril',
  'maig',
  'juny',
  'juliol',
  'agost',
  'setembre',
  'octubre',
  'novembre',
  'desembre',
];

export const WEEKDAYS_CA = [
  'dilluns',
  'dimarts',
  'dimecres',
  'dijous',
  'divendres',
  'dissabte',
  'diumenge',
];

export const WEEKDAYS_SHORT = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

export function formatLongDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${WEEKDAYS_CA[weekdayMonday0(iso)]} ${d} de ${MONTHS[m - 1]}`;
}

export function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`;
}

export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Bon dia';
  if (hour < 19) return 'Bona tarda';
  return 'Bon vespre';
}
