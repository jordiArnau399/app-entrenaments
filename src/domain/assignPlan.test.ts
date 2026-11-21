import { describe, expect, it } from 'vitest';
import { addPlanExercise, assignTemplate, removePlanExercise, updatePlanTarget } from './assignPlan';
import { addDays } from './dates';
import { sequentialIds } from './ids';
import type { Template } from './types';

function template(): Template {
  return {
    id: 'tpl_test',
    trainerId: 'trn_jordi',
    name: 'Força',
    description: '',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    days: [
      {
        id: 'td_a',
        weekday: 0,
        name: 'Força A',
        exercises: [
          {
            id: 'ti_squat',
            exerciseId: 'ex_esquat',
            sortOrder: 0,
            notes: '',
            strength: { sets: 4, reps: 6, weightKg: 80 },
            cardio: null,
          },
        ],
      },
    ],
  };
}

describe('assignació de plantilla', () => {
  it('copia el pla i les sessions, i la plantilla queda independent', () => {
    const source = template();
    const { plan, sessions } = assignTemplate({
      template: source,
      clientId: 'cli_pau',
      trainerId: 'trn_jordi',
      startDate: '2026-11-02',
      weeks: 2,
      nowIso: '2026-11-02T09:00:00.000Z',
      ids: sequentialIds('a'),
    });

    expect(plan.sourceTemplateId).toBe('tpl_test');
    expect(plan.id).not.toBe(source.id);
    expect(plan.days[0].id).not.toBe(source.days[0].id);
    expect(plan.days[0].exercises[0].id).not.toBe(source.days[0].exercises[0].id);
    expect(plan.startDate).toBe('2026-11-02');
    expect(plan.endDate).toBe('2026-11-15');
    expect(sessions.map((session) => session.date)).toEqual(['2026-11-02', '2026-11-09']);
    expect(sessions[0].exercises[0].strength?.weightKg).toBe(80);
    expect(sessions[0].exercises[0].sourceItemId).toBe(plan.days[0].exercises[0].id);

    source.days[0].exercises[0].strength!.weightKg = 1;
    source.name = 'Canviada';
    expect(plan.days[0].exercises[0].strength?.weightKg).toBe(80);
    expect(plan.name).toBe('Força');
    expect(sessions[0].exercises[0].strength?.weightKg).toBe(80);

    plan.days[0].exercises[0].strength!.weightKg = 50;
    expect(source.days[0].exercises[0].strength?.weightKg).toBe(1);
  });

  it('personalitzar el pla canvia les sessions futures i no les passades ni la plantilla', () => {
    const source = template();
    const assigned = assignTemplate({
      template: source,
      clientId: 'cli_pau',
      trainerId: 'trn_jordi',
      startDate: '2026-11-02',
      weeks: 3,
      nowIso: '2026-11-02T09:00:00.000Z',
      ids: sequentialIds('b'),
    });
    const today = '2026-11-09';
    const itemId = assigned.plan.days[0].exercises[0].id;
    const updated = updatePlanTarget({
      plan: assigned.plan,
      sessions: assigned.sessions,
      itemId,
      today,
      nowIso: '2026-11-09T10:00:00.000Z',
      strength: { sets: 4, reps: 6, weightKg: 90 },
    });

    const past = updated.sessions.find((session) => session.date === '2026-11-02')!;
    const current = updated.sessions.find((session) => session.date === today)!;
    const future = updated.sessions.find((session) => session.date === '2026-11-16')!;
    expect(past.exercises[0].strength?.weightKg).toBe(80);
    expect(current.exercises[0].strength?.weightKg).toBe(90);
    expect(future.exercises[0].strength?.weightKg).toBe(90);
    expect(updated.plan.days[0].exercises[0].strength?.weightKg).toBe(90);
    expect(source.days[0].exercises[0].strength?.weightKg).toBe(80);
    expect(assigned.plan.days[0].exercises[0].strength?.weightKg).toBe(80);
  });

  it('afegir i treure un exercici només afecta les sessions pendents', () => {
    const source = template();
    const assigned = assignTemplate({
      template: source,
      clientId: 'cli_pau',
      trainerId: 'trn_jordi',
      startDate: '2026-11-02',
      weeks: 2,
      nowIso: '2026-11-02T09:00:00.000Z',
      ids: sequentialIds('c'),
    });
    const ids = sequentialIds('add');
    const added = addPlanExercise({
      plan: assigned.plan,
      sessions: assigned.sessions,
      dayId: assigned.plan.days[0].id,
      exerciseId: 'ex_banca',
      strength: { sets: 3, reps: 8, weightKg: 40 },
      cardio: null,
      today: '2026-11-09',
      nowIso: '2026-11-09T10:00:00.000Z',
      ids,
    });
    expect(added.plan.days[0].exercises).toHaveLength(2);
    expect(added.sessions.find((session) => session.date === '2026-11-02')!.exercises).toHaveLength(1);
    expect(added.sessions.find((session) => session.date === '2026-11-09')!.exercises).toHaveLength(2);

    const removed = removePlanExercise({
      plan: added.plan,
      sessions: added.sessions,
      itemId: added.plan.days[0].exercises[1].id,
      today: '2026-11-09',
      nowIso: '2026-11-09T11:00:00.000Z',
    });
    expect(removed.plan.days[0].exercises).toHaveLength(1);
    expect(removed.sessions.find((session) => session.date === '2026-11-09')!.exercises).toHaveLength(1);
    expect(addDays('2026-11-02', 7)).toBe('2026-11-09');
  });
});
