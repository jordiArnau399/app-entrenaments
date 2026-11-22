import { addDays, eachDate, isIsoDate, weekdayMonday0 } from './dates';
import { createIdFactory, type IdFactory } from './ids';
import type { AssignedPlan, CardioTarget, ExerciseTarget, PlannedSession, PlanDay, StrengthTarget, Template } from './types';

export type AssignInput = {
  template: Template;
  clientId: string;
  trainerId: string;
  startDate: string;
  weeks: number;
  nowIso: string;
  ids?: IdFactory;
};

export type AssignResult = {
  plan: AssignedPlan;
  sessions: PlannedSession[];
};

function copyTarget(item: ExerciseTarget, id: string, sourceItemId?: string): ExerciseTarget {
  return {
    id,
    exerciseId: item.exerciseId,
    sourceItemId,
    sortOrder: item.sortOrder,
    notes: item.notes,
    strength: item.strength ? { ...item.strength } : null,
    cardio: item.cardio ? { ...item.cardio } : null,
  };
}

function copyDay(day: PlanDay, ids: IdFactory): PlanDay {
  return {
    id: ids.day(),
    weekday: day.weekday,
    name: day.name,
    exercises: day.exercises
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item, index) => copyTarget({ ...item, sortOrder: index }, ids.item())),
  };
}

/**
 * Copia la plantilla com a pla del client i genera les sessions del calendari.
 * La còpia és independent: editar la plantilla després no toca el pla ni les sessions.
 */
export function assignTemplate(input: AssignInput): AssignResult {
  if (!isIsoDate(input.startDate)) {
    throw new Error("Data d'inici invàlida");
  }
  if (!Number.isInteger(input.weeks) || input.weeks < 1 || input.weeks > 52) {
    throw new Error("La durada ha de ser d'1 a 52 setmanes");
  }
  const ids = input.ids ?? createIdFactory();
  const days = input.template.days.map((day) => copyDay(day, ids));
  const endDate = addDays(input.startDate, input.weeks * 7 - 1);
  const plan: AssignedPlan = {
    id: ids.plan(),
    clientId: input.clientId,
    trainerId: input.trainerId,
    sourceTemplateId: input.template.id,
    name: input.template.name,
    startDate: input.startDate,
    endDate,
    status: 'active',
    days,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  };

  return { plan, sessions: sessionsForPlan(plan, input.nowIso, ids) };
}

/** Sessions de calendari d'un pla. El client les necessita per veure què toca, no només el pla. */
export function sessionsForPlan(plan: AssignedPlan, nowIso: string, ids?: IdFactory): PlannedSession[] {
  const byWeekday = new Map(plan.days.map((day) => [day.weekday, day]));
  const sessions: PlannedSession[] = [];
  for (const date of eachDate(plan.startDate, plan.endDate)) {
    const day = byWeekday.get(weekdayMonday0(date));
    if (!day) continue;
    sessions.push({
      id: ids ? ids.session() : `ses_${plan.id}_${date}`,
      planId: plan.id,
      clientId: plan.clientId,
      trainerId: plan.trainerId,
      date,
      name: day.name,
      status: 'pending',
      updatedAt: nowIso,
      exercises: day.exercises.map((item, index) =>
        copyTarget(item, ids ? ids.sessionItem() : `sei_${plan.id}_${date}_${index}`, item.id),
      ),
    });
  }
  return sessions;
}

/**
 * Si el pla ha arribat sense les seves sessions (es van desar només en local),
 * les reconstrueix. No en duplica si ja n'hi ha alguna d'aquest pla.
 */
export function fillMissingPlanSessions(
  plans: AssignedPlan[],
  sessions: PlannedSession[],
  nowIso: string,
  ids?: IdFactory,
): PlannedSession[] {
  const extra: PlannedSession[] = [];
  for (const plan of plans) {
    if (plan.status !== 'active') continue;
    if (sessions.some((session) => session.planId === plan.id)) continue;
    extra.push(...sessionsForPlan(plan, nowIso, ids));
  }
  return extra.length === 0 ? sessions : [...sessions, ...extra];
}

export function shiftWeekdays(template: Template, weekdayDelta: number): Template {
  const delta = ((weekdayDelta % 7) + 7) % 7;
  return {
    ...template,
    days: template.days.map((day) => ({
      ...day,
      weekday: (day.weekday + delta) % 7,
      exercises: day.exercises.map((item) => ({
        ...item,
        strength: item.strength ? { ...item.strength } : null,
        cardio: item.cardio ? { ...item.cardio } : null,
      })),
    })),
  };
}

/** Desplaça el primer dia de la plantilla perquè caigui en la data indicada. No muta l'original. */
export function shiftTemplateToDate(template: Template, isoDate: string): Template {
  const ordered = template.days.slice().sort((a, b) => a.weekday - b.weekday);
  if (ordered.length === 0) return shiftWeekdays(template, 0);
  const delta = weekdayMonday0(isoDate) - ordered[0].weekday;
  return shiftWeekdays(template, delta);
}

type CustomizeBase = {
  plan: AssignedPlan;
  sessions: PlannedSession[];
  today: string;
  nowIso: string;
};

function isFuturePending(session: PlannedSession, planId: string, today: string): boolean {
  return session.planId === planId && session.status === 'pending' && session.date >= today;
}

function replaceSessionTargets(
  sessions: PlannedSession[],
  plan: AssignedPlan,
  today: string,
  nowIso: string,
  match: (session: PlannedSession) => boolean,
  mapExercise: (exercise: ExerciseTarget, session: PlannedSession) => ExerciseTarget | null,
): PlannedSession[] {
  return sessions.map((session) => {
    if (!isFuturePending(session, plan.id, today) || !match(session)) return session;
    const exercises = session.exercises
      .map((exercise) => mapExercise(exercise, session))
      .filter((exercise): exercise is ExerciseTarget => exercise != null)
      .map((exercise, index) => ({ ...exercise, sortOrder: index }));
    return { ...session, exercises, updatedAt: nowIso };
  });
}

export function updatePlanTarget(
  input: CustomizeBase & {
    itemId: string;
    strength?: StrengthTarget | null;
    cardio?: CardioTarget | null;
    notes?: string;
  },
): { plan: AssignedPlan; sessions: PlannedSession[] } {
  let found = false;
  const days = input.plan.days.map((day) => ({
    ...day,
    exercises: day.exercises.map((item) => {
      if (item.id !== input.itemId) return item;
      found = true;
      return {
        ...item,
        notes: input.notes ?? item.notes,
        strength: input.strength === undefined ? item.strength : input.strength,
        cardio: input.cardio === undefined ? item.cardio : input.cardio,
      };
    }),
  }));
  if (!found) throw new Error('Aquest exercici no és al pla');
  const plan: AssignedPlan = { ...input.plan, days, updatedAt: input.nowIso };
  const updated = days.flatMap((day) => day.exercises).find((item) => item.id === input.itemId)!;
  const sessions = replaceSessionTargets(
    input.sessions,
    plan,
    input.today,
    input.nowIso,
    () => true,
    (exercise) => {
      if (exercise.sourceItemId !== input.itemId) return exercise;
      return copyTarget(updated, exercise.id, updated.id);
    },
  );
  return { plan, sessions };
}

export function addPlanExercise(
  input: CustomizeBase & {
    dayId: string;
    exerciseId: string;
    strength: StrengthTarget | null;
    cardio: CardioTarget | null;
    ids: Pick<IdFactory, 'item' | 'sessionItem'>;
  },
): { plan: AssignedPlan; sessions: PlannedSession[] } {
  const day = input.plan.days.find((item) => item.id === input.dayId);
  if (!day) throw new Error('Aquest dia no és al pla');
  const item: ExerciseTarget = {
    id: input.ids.item(),
    exerciseId: input.exerciseId,
    sortOrder: day.exercises.length,
    notes: '',
    strength: input.strength ? { ...input.strength } : null,
    cardio: input.cardio ? { ...input.cardio } : null,
  };
  const plan: AssignedPlan = {
    ...input.plan,
    updatedAt: input.nowIso,
    days: input.plan.days.map((current) =>
      current.id === day.id ? { ...current, exercises: [...current.exercises, item] } : current,
    ),
  };
  const sessions = replaceSessionTargets(
    input.sessions,
    plan,
    input.today,
    input.nowIso,
    (session) => weekdayMonday0(session.date) === day.weekday,
    (exercise) => exercise,
  ).map((session) => {
    if (!isFuturePending(session, plan.id, input.today)) return session;
    if (weekdayMonday0(session.date) !== day.weekday) return session;
    if (session.exercises.some((exercise) => exercise.sourceItemId === item.id)) return session;
    return {
      ...session,
      updatedAt: input.nowIso,
      exercises: [...session.exercises, copyTarget(item, input.ids.sessionItem(), item.id)],
    };
  });
  return { plan, sessions };
}

export function removePlanExercise(
  input: CustomizeBase & { itemId: string },
): { plan: AssignedPlan; sessions: PlannedSession[] } {
  const plan: AssignedPlan = {
    ...input.plan,
    updatedAt: input.nowIso,
    days: input.plan.days.map((day) => ({
      ...day,
      exercises: day.exercises
        .filter((item) => item.id !== input.itemId)
        .map((item, index) => ({ ...item, sortOrder: index })),
    })),
  };
  const sessions = replaceSessionTargets(
    input.sessions,
    plan,
    input.today,
    input.nowIso,
    () => true,
    (exercise) => (exercise.sourceItemId === input.itemId ? null : exercise),
  );
  return { plan, sessions };
}

/**
 * Tanca el pla actiu el dia abans i posa la plantilla nova a partir d'avui.
 * Les sessions ja fetes o passades es queden. Les pendents d'avui en endavant se substitueixen.
 */
export function replaceClientPlan(input: {
  plans: AssignedPlan[];
  sessions: PlannedSession[];
  logs: { plannedSessionId: string }[];
  template: Template;
  clientId: string;
  trainerId: string;
  startDate: string;
  weeks: number;
  nowIso: string;
  ids?: IdFactory;
}): { plans: AssignedPlan[]; sessions: PlannedSession[]; removedSessionIds: string[]; plan: AssignedPlan } {
  if (!isIsoDate(input.startDate)) throw new Error("Data d'inici invàlida");
  const logged = new Set(input.logs.map((log) => log.plannedSessionId));
  const activeIds = new Set(
    input.plans.filter((plan) => plan.clientId === input.clientId && plan.status === 'active').map((plan) => plan.id),
  );
  const closedEnd = addDays(input.startDate, -1);
  const plans = input.plans.map((plan) => {
    if (!activeIds.has(plan.id)) return plan;
    return {
      ...plan,
      status: 'completed' as const,
      endDate: closedEnd < plan.startDate ? plan.startDate : closedEnd,
      updatedAt: input.nowIso,
    };
  });
  const removedSessionIds: string[] = [];
  const kept = input.sessions.filter((session) => {
    if (!activeIds.has(session.planId)) return true;
    const drop = session.date >= input.startDate && session.status === 'pending' && !logged.has(session.id);
    if (drop) removedSessionIds.push(session.id);
    return !drop;
  });
  const assigned = assignTemplate({
    template: input.template,
    clientId: input.clientId,
    trainerId: input.trainerId,
    startDate: input.startDate,
    weeks: input.weeks,
    nowIso: input.nowIso,
    ids: input.ids,
  });
  const occupied = new Set(
    kept.filter((session) => session.clientId === input.clientId && session.date >= input.startDate).map((session) => session.date),
  );
  return {
    plans: [...plans, assigned.plan],
    sessions: [...kept, ...assigned.sessions.filter((session) => !occupied.has(session.date))],
    removedSessionIds,
    plan: assigned.plan,
  };
}

export function pauseOtherPlans(
  plans: AssignedPlan[],
  clientId: string,
  activePlanId: string,
  nowIso: string,
): AssignedPlan[] {
  return plans.map((plan) => {
    if (plan.clientId === clientId && plan.id !== activePlanId && plan.status === 'active') {
      return { ...plan, status: 'paused', updatedAt: nowIso };
    }
    return plan;
  });
}
