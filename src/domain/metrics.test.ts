import { describe, expect, it } from 'vitest';
import { compareSession, weightSeries } from './metrics';
import { createSessionLog } from './sessionLog';
import type { Exercise, PlannedSession } from './types';

const exercises: Exercise[] = [
  {
    id: 'ex_esquat',
    trainerId: 'trn',
    name: 'Esquat',
    type: 'strength',
    category: 'Cames',
    description: '',
    imageUrl: null,
    videoUrl: null,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'ex_correr',
    trainerId: 'trn',
    name: 'Córrer',
    type: 'cardio',
    category: 'Resistència',
    description: '',
    imageUrl: null,
    videoUrl: null,
    createdAt: '',
    updatedAt: '',
  },
];

function session(): PlannedSession {
  return {
    id: 'ses_1',
    planId: 'plan_1',
    clientId: 'cli',
    trainerId: 'trn',
    date: '2026-11-21',
    name: 'Força A',
    status: 'pending',
    updatedAt: '2026-11-21T00:00:00.000Z',
    exercises: [
      {
        id: 'sei_squat',
        exerciseId: 'ex_esquat',
        sortOrder: 0,
        notes: '',
        strength: { sets: 4, reps: 6, weightKg: 80 },
        cardio: null,
      },
      {
        id: 'sei_run',
        exerciseId: 'ex_correr',
        sortOrder: 1,
        notes: '',
        strength: null,
        cardio: { durationSec: 1800, distanceM: 5000, paceSecPerKm: 360 },
      },
    ],
  };
}

describe('planificat contra fet', () => {
  it('marca assolit només quan el pes, les sèries i les reps arriben a l’objectiu copiat', () => {
    const planned = session();
    const met = createSessionLog({
      session: planned,
      feeling: 'be',
      rpe: 7,
      notes: '',
      deviceId: 'dev',
      endedAt: '2026-11-21T19:00:00.000Z',
      ids: { log: () => 'log_1', exerciseLog: (() => { let n = 0; return () => `elog_${++n}`; })() },
      exercises: [
        {
          plannedExerciseId: 'sei_squat',
          sets: [
            { weightKg: 80, reps: 6 },
            { weightKg: 80, reps: 6 },
            { weightKg: 82.5, reps: 6 },
            { weightKg: 80, reps: 6 },
          ],
          durationSec: null,
          distanceM: null,
        },
        { plannedExerciseId: 'sei_run', sets: null, durationSec: 1800, distanceM: 5100 },
      ],
    });
    const comparison = compareSession(met.session, met.log, exercises);
    expect(comparison[0].met).toBe(true);
    expect(comparison[0].actualWeightKg).toBe(82.5);
    expect(comparison[0].plannedLabel).toBe('4 × 6 · 80 kg');
    expect(comparison[1].met).toBe(true);
    expect(comparison[1].actualLabel).toContain('5.1 km');

    const short = createSessionLog({
      session: planned,
      feeling: 'dur',
      rpe: 9,
      notes: '',
      deviceId: 'dev',
      endedAt: '2026-11-21T19:00:00.000Z',
      ids: { log: () => 'log_2', exerciseLog: () => 'elog_x' },
      exercises: [
        {
          plannedExerciseId: 'sei_squat',
          sets: [
            { weightKg: 80, reps: 6 },
            { weightKg: 75, reps: 6 },
            { weightKg: 80, reps: 5 },
          ],
          durationSec: null,
          distanceM: null,
        },
        { plannedExerciseId: 'sei_run', sets: null, durationSec: 1500, distanceM: 4000 },
      ],
    });
    const missed = compareSession(short.session, short.log, exercises);
    expect(missed[0].met).toBe(false);
    expect(missed[0].actualSets).toBe(3);
    expect(missed[1].met).toBe(false);
  });

  it('rebutja un esforç percebut fora de l’1 al 10', () => {
    expect(() =>
      createSessionLog({
        session: session(),
        feeling: 'be',
        rpe: 11,
        notes: '',
        deviceId: 'dev',
        endedAt: '2026-11-21T19:00:00.000Z',
        ids: { log: () => 'log', exerciseLog: () => 'elog' },
        exercises: [],
      }),
    ).toThrow(/1 al 10/);
  });
});

describe('sèrie de pes', () => {
  it('es queda el pes màxim de cada sessió i ignora altres exercicis', () => {
    const series = weightSeries(
      [
        {
          date: '2026-11-01',
          exercises: [
            {
              id: 'a',
              exerciseId: 'ex_esquat',
              plannedExerciseId: 'p',
              sets: [
                { weightKg: 60, reps: 5 },
                { weightKg: 70, reps: 3 },
              ],
              durationSec: null,
              distanceM: null,
              paceSecPerKm: null,
              plannedSets: 2,
              plannedReps: 5,
              plannedWeightKg: 60,
              plannedDurationSec: null,
              plannedDistanceM: null,
            },
          ],
        },
        {
          date: '2026-11-08',
          exercises: [
            {
              id: 'b',
              exerciseId: 'ex_esquat',
              plannedExerciseId: 'p',
              sets: [{ weightKg: 72.5, reps: 5 }],
              durationSec: null,
              distanceM: null,
              paceSecPerKm: null,
              plannedSets: 4,
              plannedReps: 5,
              plannedWeightKg: 70,
              plannedDurationSec: null,
              plannedDistanceM: null,
            },
            {
              id: 'c',
              exerciseId: 'ex_banca',
              plannedExerciseId: 'q',
              sets: [{ weightKg: 40, reps: 8 }],
              durationSec: null,
              distanceM: null,
              paceSecPerKm: null,
              plannedSets: 3,
              plannedReps: 8,
              plannedWeightKg: 40,
              plannedDurationSec: null,
              plannedDistanceM: null,
            },
          ],
        },
      ],
      'ex_esquat',
    );
    expect(series).toEqual([
      { date: '2026-11-01', weightKg: 70 },
      { date: '2026-11-08', weightKg: 72.5 },
    ]);
  });
});
