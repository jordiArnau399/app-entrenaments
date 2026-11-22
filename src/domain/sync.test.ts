import { describe, expect, it } from 'vitest';
import { buildSeed } from './seed';
import { enqueue, mergeSnapshots, processQueue, resolveSyncConflict, type SyncOp } from './sync';
import { CLIENT_PAU, TEMPLATE_STRENGTH } from './types';

function draft(partial: Partial<SyncOp> & Pick<SyncOp, 'id' | 'entity' | 'entityId'>): SyncOp {
  return {
    op: 'upsert',
    payload: { ok: true },
    createdAt: '2026-11-21T10:00:00.000Z',
    attempts: 0,
    lastError: null,
    status: 'pending',
    ...partial,
  };
}

describe('cua de sincronització', () => {
  it('substitueix l’operació pendent de la mateixa entitat', () => {
    const first = enqueue([], {
      id: 'op_1',
      entity: 'session_log',
      entityId: 'log_1',
      op: 'upsert',
      payload: { rpe: 6 },
      createdAt: '2026-11-21T10:00:00.000Z',
    });
    const second = enqueue(first, {
      id: 'op_2',
      entity: 'session_log',
      entityId: 'log_1',
      op: 'upsert',
      payload: { rpe: 8 },
      createdAt: '2026-11-21T10:05:00.000Z',
    });
    const withOther = enqueue(second, {
      id: 'op_3',
      entity: 'plan',
      entityId: 'plan_1',
      op: 'upsert',
      payload: { name: 'Força' },
      createdAt: '2026-11-21T10:06:00.000Z',
    });
    expect(withOther.map((op) => op.id)).toEqual(['op_2', 'op_3']);
    expect(withOther[0].payload).toEqual({ rpe: 8 });
  });

  it('marca sincronitzades les operacions enviades i reintenta les que fallen', async () => {
    const queue = [
      draft({ id: 'ok', entity: 'session_log', entityId: 'log_ok' }),
      draft({ id: 'ko', entity: 'session_log', entityId: 'log_ko' }),
      draft({ id: 'done', entity: 'plan', entityId: 'plan_1', status: 'synced' }),
    ];
    const sent: string[] = [];
    const first = await processQueue(queue, async (op) => {
      sent.push(op.id);
      if (op.id === 'ko') throw new Error('sense xarxa');
    });
    expect(sent).toEqual(['ok', 'ko']);
    expect(first.queue.find((op) => op.id === 'ok')?.status).toBe('synced');
    expect(first.queue.find((op) => op.id === 'ko')).toMatchObject({ status: 'pending', attempts: 1, lastError: 'sense xarxa' });
    expect(first.queue.find((op) => op.id === 'done')?.status).toBe('synced');

    let failing = first.queue;
    for (let attempt = 0; attempt < 7; attempt += 1) {
      failing = (await processQueue(failing, async (op) => {
        if (op.entityId === 'log_ko') throw new Error('sense xarxa');
      })).queue;
    }
    expect(failing.find((op) => op.id === 'ko')?.status).toBe('failed');
    expect(failing.find((op) => op.id === 'ko')?.attempts).toBe(8);
  });

  it('el registre del client i el pla de l’entrenador guanyen el conflicte', () => {
    const client = resolveSyncConflict(
      'session_log',
      { origin: 'server', updatedAt: '2026-06-01T00:00:00.000Z', value: 'rpe 3' },
      { origin: 'client', updatedAt: '2026-01-01T00:00:00.000Z', value: 'rpe 8' },
    );
    expect(client.value).toBe('rpe 8');

    const trainer = resolveSyncConflict(
      'plan',
      { origin: 'trainer', updatedAt: '2026-01-01T00:00:00.000Z', value: '80 kg' },
      { origin: 'server', updatedAt: '2026-06-01T00:00:00.000Z', value: '10 kg' },
    );
    expect(trainer.value).toBe('80 kg');

    const newestClient = resolveSyncConflict(
      'session_log',
      { origin: 'client', updatedAt: '2026-01-01T00:00:00.000Z', value: 'antic' },
      { origin: 'client', updatedAt: '2026-02-01T00:00:00.000Z', value: 'nou' },
    );
    expect(newestClient.value).toBe('nou');
  });

  it('en fusionar, un registre pendent local no el tapa el servidor', () => {
    const local = buildSeed(new Date(2026, 10, 21));
    const log = local.logs[0];
    local.logs = local.logs.map((item) =>
      item.id === log.id ? { ...item, rpe: 9, syncStatus: 'pending', updatedAt: '2026-11-01T00:00:00.000Z' } : item,
    );
    const remote = {
      ...local,
      logs: local.logs.map((item) =>
        item.id === log.id ? { ...item, rpe: 2, syncStatus: 'synced' as const, updatedAt: '2026-12-01T00:00:00.000Z' } : item,
      ),
    };
    const merged = mergeSnapshots(local, remote);
    expect(merged.logs.find((item) => item.id === log.id)?.rpe).toBe(9);
    expect(merged.settings).toEqual(local.settings);
  });
});

describe('dades de demostració', () => {
  it('deixa una sessió d’avui per al Pau i historial per a la Marta, sense lligar el pla a la plantilla', () => {
    const today = '2026-11-21';
    const snapshot = buildSeed(new Date(2026, 10, 21));
    const pauToday = snapshot.sessions.filter((session) => session.clientId === CLIENT_PAU && session.date === today);
    expect(pauToday).toHaveLength(1);
    expect(pauToday[0].status).toBe('pending');
    expect(snapshot.logs.some((log) => log.plannedSessionId === pauToday[0].id)).toBe(false);

    const template = snapshot.templates.find((item) => item.id === TEMPLATE_STRENGTH)!;
    const pauPlan = snapshot.plans.find((plan) => plan.clientId === CLIENT_PAU)!;
    expect(template.days[0].weekday).toBe(0);
    expect(pauPlan.days.some((day) => day.weekday === 5)).toBe(true);
    template.days[0].exercises[0].strength!.weightKg = 1;
    expect(pauPlan.days[0].exercises[0].strength?.weightKg).not.toBe(1);

    const martaSquatLogs = snapshot.logs.filter(
      (log) => log.clientId === 'cli_marta' && log.exercises.some((exercise) => exercise.exerciseId === 'ex_esquat'),
    );
    expect(martaSquatLogs.length).toBeGreaterThanOrEqual(3);
    expect(snapshot.trainers[0].name).toBe('Jordi Arnau');
    expect(snapshot.clients.every((client) => client.trainerId === snapshot.trainers[0].id)).toBe(true);
  });
});
