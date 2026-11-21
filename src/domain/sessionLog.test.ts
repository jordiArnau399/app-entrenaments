import { describe, expect, it } from 'vitest';
import { buildSeed } from './seed';
import { completeSessionsFromLogs, createSessionLog } from './sessionLog';

describe('una sessió amb registre està feta', () => {
  it('completa la pendent i deixa igual la que no té registre', () => {
    const seed = buildSeed(new Date(2026, 10, 21));
    const pending = seed.sessions.find((session) => session.status === 'pending');
    const other = seed.sessions.find((session) => session.status === 'pending' && session.id !== pending?.id);
    expect(pending).toBeTruthy();
    expect(other).toBeTruthy();
    const { log } = createSessionLog({
      session: pending!,
      feeling: 'dur',
      rpe: 8,
      notes: 'Es molt de pes per mi',
      deviceId: 'dev',
      endedAt: '2026-11-23T18:00:00.000Z',
      ids: { log: () => 'log_dia1', exerciseLog: () => 'elog_dia1' },
      exercises: pending!.exercises.map((exercise) => ({
        plannedExerciseId: exercise.id,
        sets: exercise.strength ? [{ weightKg: 20, reps: 8 }] : null,
        durationSec: exercise.cardio?.durationSec ?? null,
        distanceM: exercise.cardio?.distanceM ?? null,
      })),
    });
    expect(pending!.status).toBe('pending');
    const logs = [...seed.logs, { ...log, syncStatus: 'synced' as const }];
    const next = completeSessionsFromLogs(seed.sessions, logs);
    expect(next.find((session) => session.id === pending!.id)?.status).toBe('done');
    expect(next.find((session) => session.id === other!.id)?.status).toBe('pending');
    expect(completeSessionsFromLogs(next, logs)).toBe(next);
  });
});
