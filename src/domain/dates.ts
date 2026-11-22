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

/** Dia civil. Amb fus horari, és el dia d'aquella zona, no el de l'aparell. */
export function todayIso(now = new Date(), timeZone?: string | null): string {
  if (!timeZone) return formatISODate(now);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

export function hourInZone(now = new Date(), timeZone?: string | null): number {
  if (!timeZone) return now.getHours();
  const value = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(now);
  return Number(value);
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid';
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

export function greeting(date = new Date(), timeZone?: string | null): string {
  const hour = hourInZone(date, timeZone);
  if (hour < 12) return 'Bon dia';
  if (hour < 19) return 'Bona tarda';
  return 'Bon vespre';
}
