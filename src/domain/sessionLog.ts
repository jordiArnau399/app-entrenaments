import { paceSecPerKm } from './format';
import type { IdFactory } from './ids';
import type { ExerciseLog, PlannedSession, SessionFeeling, SessionLog, SetLog } from './types';

export type LogDraftExercise = {
  plannedExerciseId: string;
  sets: SetLog[] | null;
  durationSec: number | null;
  distanceM: number | null;
};

export function createSessionLog(input: {
  session: PlannedSession;
  exercises: LogDraftExercise[];
  feeling: SessionFeeling;
  rpe: number;
  notes: string;
  deviceId: string;
  endedAt: string;
  ids: Pick<IdFactory, 'log' | 'exerciseLog'>;
}): { log: SessionLog; session: PlannedSession } {
  if (!Number.isInteger(input.rpe) || input.rpe < 1 || input.rpe > 10) {
    throw new Error("L'esforç percebut ha de ser un enter de l'1 al 10");
  }
  const exerciseLogs: ExerciseLog[] = input.session.exercises.map((planned) => {
    const draft = input.exercises.find((item) => item.plannedExerciseId === planned.id);
    const sets = draft?.sets ?? null;
    const durationSec = draft?.durationSec ?? null;
    const distanceM = draft?.distanceM ?? null;
    return {
      id: input.ids.exerciseLog(),
      exerciseId: planned.exerciseId,
      plannedExerciseId: planned.id,
      sets: sets ? sets.map((set) => ({ ...set })) : null,
      durationSec,
      distanceM,
      paceSecPerKm: durationSec != null && distanceM != null ? paceSecPerKm(durationSec, distanceM) : null,
      plannedSets: planned.strength?.sets ?? null,
      plannedReps: planned.strength?.reps ?? null,
      plannedWeightKg: planned.strength?.weightKg ?? null,
      plannedDurationSec: planned.cardio?.durationSec ?? null,
      plannedDistanceM: planned.cardio?.distanceM ?? null,
    };
  });
  const log: SessionLog = {
    id: input.ids.log(),
    plannedSessionId: input.session.id,
    clientId: input.session.clientId,
    trainerId: input.session.trainerId,
    startedAt: input.endedAt,
    endedAt: input.endedAt,
    feeling: input.feeling,
    rpe: input.rpe,
    notes: input.notes.trim(),
    exercises: exerciseLogs,
    syncStatus: 'pending',
    deviceId: input.deviceId,
    updatedAt: input.endedAt,
  };
  return {
    log,
    session: { ...input.session, status: 'done', updatedAt: input.endedAt },
  };
}

/**
 * Si el registre va pujar i l'estat de la sessió no, la sessió queda pendent
 * amb un resultat a sota. El registre mana: la sessió està feta.
 */
export function completeSessionsFromLogs(sessions: PlannedSession[], logs: SessionLog[]): PlannedSession[] {
  const loggedAt = new Map(logs.map((log) => [log.plannedSessionId, log.updatedAt]));
  let changed = false;
  const next = sessions.map((session) => {
    const updatedAt = loggedAt.get(session.id);
    if (!updatedAt || session.status === 'done') return session;
    changed = true;
    return { ...session, status: 'done' as const, updatedAt };
  });
  return changed ? next : sessions;
}
