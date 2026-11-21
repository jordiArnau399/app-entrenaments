import { addDays } from './dates';
import { adherence, compliance, weeklyCompliance, type Compliance, type WeeklyCompliance } from './compliance';
import { averageRpe, coachReading, rpeSeries, weightSeries, weightTrend, type RpePoint, type WeightPoint } from './metrics';
import type { AssignedPlan, Exercise, PlannedSession, SessionLog } from './types';

export type ClientReport = {
  activePlan: AssignedPlan | null;
  compliance: Compliance;
  weekCompliance: Compliance;
  weekly: WeeklyCompliance[];
  rpe: RpePoint[];
  rpeAvg: number | null;
  status: 'al_dia' | 'endarrerit';
  lastSessionDate: string | null;
  reading: string;
  weights: Record<string, WeightPoint[]>;
};

export function activePlan(plans: AssignedPlan[], clientId: string): AssignedPlan | null {
  return plans.find((plan) => plan.clientId === clientId && plan.status === 'active') ?? null;
}

export function sessionsFor(sessions: PlannedSession[], clientId: string): PlannedSession[] {
  return sessions.filter((session) => session.clientId === clientId).sort((a, b) => a.date.localeCompare(b.date));
}

export function logForSession(logs: SessionLog[], sessionId: string): SessionLog | null {
  return logs.find((log) => log.plannedSessionId === sessionId) ?? null;
}

export function todayAgenda(
  sessions: PlannedSession[],
  plans: AssignedPlan[],
  clientId: string,
  today: string,
): { plan: AssignedPlan | null; session: PlannedSession | null; upcoming: PlannedSession[] } {
  const plan = activePlan(plans, clientId);
  const mine = sessionsFor(sessions, clientId).filter((session) => !plan || session.planId === plan.id);
  return {
    plan,
    session: sessionOnDate(sessions, plans, clientId, today),
    upcoming: mine.filter((session) => session.date > today && session.status !== 'done').slice(0, 4),
  };
}

export function sessionOnDate(sessions: PlannedSession[], plans: AssignedPlan[], clientId: string, date: string): PlannedSession | null {
  const matches = sessions.filter((session) => session.clientId === clientId && session.date === date);
  if (matches.length === 0) return null;
  const activeIds = new Set(plans.filter((plan) => plan.clientId === clientId && plan.status === 'active').map((plan) => plan.id));
  return matches.find((session) => activeIds.has(session.planId)) ?? matches[0];
}

export function clientReport(input: {
  clientId: string;
  today: string;
  plans: AssignedPlan[];
  sessions: PlannedSession[];
  logs: SessionLog[];
  exercises: Exercise[];
}): ClientReport {
  const sessions = sessionsFor(input.sessions, input.clientId);
  const logs = input.logs.filter((log) => log.clientId === input.clientId);
  const bySession = new Map(sessions.map((session) => [session.id, session]));
  const datedLogs = logs
    .map((log) => {
      const session = bySession.get(log.plannedSessionId);
      return session ? { date: session.date, log } : null;
    })
    .filter((item): item is { date: string; log: SessionLog } => item != null)
    .sort((a, b) => a.date.localeCompare(b.date));

  const from = sessions[0]?.date ?? input.today;
  const overall = compliance(sessions, { from, to: input.today }, input.today);
  const week = compliance(sessions, { from: addDays(input.today, -6), to: input.today }, input.today);
  const rpe = rpeSeries(datedLogs.map((item) => ({ date: item.date, rpe: item.log.rpe })));
  const weights: Record<string, WeightPoint[]> = {};
  for (const exercise of input.exercises.filter((item) => item.type === 'strength')) {
    const series = weightSeries(
      datedLogs.map((item) => ({ date: item.date, exercises: item.log.exercises })),
      exercise.id,
    );
    if (series.length > 0) weights[exercise.id] = series;
  }
  const trendSource =
    weights['ex_esquat'] ??
    Object.values(weights).sort((a, b) => b.length - a.length)[0] ??
    [];
  const last = datedLogs[datedLogs.length - 1];
  return {
    activePlan: activePlan(input.plans, input.clientId),
    compliance: overall,
    weekCompliance: week,
    weekly: weeklyCompliance(sessions, input.today, 6),
    rpe,
    rpeAvg: averageRpe(rpe),
    status: adherence(week),
    lastSessionDate: last?.date ?? null,
    reading: coachReading({
      compliancePercent: overall.percent,
      due: overall.due,
      rpeAvg: averageRpe(rpe),
      weightTrend: weightTrend(trendSource),
    }),
    weights,
  };
}
