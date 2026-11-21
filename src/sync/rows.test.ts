import { describe, expect, it } from 'vitest';
import type { Actor } from '../domain/access';
import { logToRow, messageToRow, messageWrite, opIsAllowed, planToRow } from './rows';
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

  it('un missatge nou s’insereix i la lectura es marca amb un pedaç', () => {
    const sent = messageToRow({
      id: 'msg-1',
      trainerId: 'trainer-1',
      clientId: 'client-1',
      senderId: 'client-1',
      recipientId: 'trainer-1',
      text: 'Hola',
      sentAt: '2026-11-21T10:00:00.000Z',
      readAt: null,
      status: 'sent',
      syncStatus: 'pending',
      updatedAt: '2026-11-21T10:00:00.000Z',
    });
    expect(messageWrite(sent, 'client-1')?.method).toBe('POST');
    expect(messageWrite(sent, 'trainer-1')).toBeNull();
    const read = { ...sent, read_at: '2026-11-21T10:05:00.000Z' };
    const patch = messageWrite(read, 'trainer-1');
    expect(patch?.method).toBe('PATCH');
    expect(patch?.body).toEqual({ read_at: '2026-11-21T10:05:00.000Z' });
    expect(messageWrite(read, 'client-1')).toBeNull();
    expect(opIsAllowed(trainer, 'message', { trainerId: 'trainer-1', clientId: 'client-1', senderId: 'client-1' })).toBe(true);
  });
});
