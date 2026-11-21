import { addDays, weekStart } from './dates';
import type { SessionStatus } from './types';

export type SessionSlice = {
  date: string;
  status: SessionStatus;
};

export type Compliance = {
  due: number;
  done: number;
  skipped: number;
  pending: number;
  percent: number;
};

/**
 * Una sessió passada sense registre es considera saltada.
 * La d'avui només entra al denominador si ja està feta o saltada:
 * a mig dia, una sessió pendent no ha de fer baixar el compliment.
 */
export function effectiveStatus(status: SessionStatus, date: string, today: string): SessionStatus {
  if (status === 'done') return 'done';
  if (date < today) return 'skipped';
  if (status === 'skipped') return 'skipped';
  return 'pending';
}

function countsAsDue(date: string, status: SessionStatus, today: string): boolean {
  if (date > today) return false;
  if (date < today) return true;
  const effective = effectiveStatus(status, date, today);
  return effective === 'done' || effective === 'skipped';
}

export function compliance(sessions: SessionSlice[], range: { from: string; to: string }, today: string): Compliance {
  const relevant = sessions.filter((session) => session.date >= range.from && session.date <= range.to);
  let due = 0;
  let done = 0;
  let skipped = 0;
  let pending = 0;
  for (const session of relevant) {
    const effective = effectiveStatus(session.status, session.date, today);
    if (effective === 'pending') pending += 1;
    if (!countsAsDue(session.date, session.status, today)) continue;
    due += 1;
    if (effective === 'done') done += 1;
    else skipped += 1;
  }
  const percent = due === 0 ? 0 : Math.round((done / due) * 100);
  return { due, done, skipped, pending, percent };
}

export type WeeklyCompliance = Compliance & { weekStart: string };

export function weeklyCompliance(sessions: SessionSlice[], today: string, weeksBack = 6): WeeklyCompliance[] {
  const end = weekStart(today);
  const buckets: WeeklyCompliance[] = [];
  for (let index = weeksBack - 1; index >= 0; index -= 1) {
    const start = addDays(end, -7 * index);
    const result = compliance(sessions, { from: start, to: addDays(start, 6) }, today);
    buckets.push({ weekStart: start, ...result });
  }
  return buckets;
}

export function adherence(result: Compliance): 'al_dia' | 'endarrerit' {
  if (result.due === 0) return 'al_dia';
  if (result.skipped > 0 || result.percent < 70) return 'endarrerit';
  return 'al_dia';
}
