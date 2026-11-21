import { describe, expect, it } from 'vitest';
import type { Actor } from '../domain/access';
import { logToRow, opIsAllowed, planToRow } from './rows';
import type { AssignedPlan, SessionLog } from '../domain/types';

const client: Actor = { userId: 'client-1', role: 'client', trainerId: 'trainer-1' };
const trainer: Actor = { userId: 'trainer-1', role: 'trainer', trainerId: 'trainer-1' };

const plan = {
  id: 'plan-1',
  clientId: 'client-1',
  trainerId: 'trainer-1',
  sourceTemplateId: 'tpl',
  name: 'Força',
  startDate: '2026-11-01',
  endDate: '2026-12-01',
  status: 'active',
  days: [],
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
} satisfies AssignedPlan;

describe('files que viatgen al núvol', () => {
  it('un registre porta el client i l\'entrenador fora del JSON, i només el client el pot enviar', () => {
    const log = {
      id: 'log-1',
      plannedSessionId: 'ses-1',
      clientId: 'client-1',
      trainerId: 'trainer-1',
      startedAt: '2026-11-21T18:00:00.000Z',
      endedAt: '2026-11-21T19:00:00.000Z',
      feeling: 'be',
      rpe: 7,
      notes: '',
      exercises: [],
      syncStatus: 'pending',
      deviceId: 'dev',
      updatedAt: '2026-11-21T19:00:00.000Z',
    } satisfies SessionLog;
    expect(logToRow(log)).toMatchObject({ trainer_id: 'trainer-1', client_id: 'client-1', id: 'log-1' });
    expect(opIsAllowed(client, 'session_log', { trainerId: log.trainerId, clientId: log.clientId })).toBe(true);
    expect(opIsAllowed(trainer, 'session_log', { trainerId: log.trainerId, clientId: log.clientId })).toBe(false);
    expect(opIsAllowed(client, 'plan', { trainerId: plan.trainerId, clientId: plan.clientId })).toBe(false);
    expect(opIsAllowed(trainer, 'plan', { trainerId: plan.trainerId, clientId: plan.clientId })).toBe(true);
    expect(planToRow(plan).client_id).toBe('client-1');
  });
});
