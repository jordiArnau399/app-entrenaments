import { describe, expect, it } from 'vitest';
import { buildSeed } from '../domain/seed';
import { pendingOps } from '../domain/sync';
import type { DataCollections } from '../domain/types';
import { Repository, type RemoteStore } from './repository';
import { MemoryStorage } from './storage';

function remoteWith(initial: DataCollections | null = null): RemoteStore & { data: DataCollections | null; pushes: number } {
  const state: RemoteStore & { data: DataCollections | null; pushes: number } = {
    name: 'hub',
    data: initial,
    pushes: 0,
    async pull() {
      return state.data;
    },
    async push(data) {
      state.pushes += 1;
      state.data = data;
    },
  };
  return state;
}

describe('repositori i cua', () => {
  it('desa el registre sense connexió i el sincronitza quan torna la xarxa', async () => {
    const storage = new MemoryStorage();
    const seed = buildSeed(new Date(2026, 10, 21));
    const session = seed.sessions.find((item) => item.clientId === 'cli_pau' && item.date === '2026-11-21')!;
    seed.settings.offline = true;
    storage.snapshot = seed;
    const remote = remoteWith(null);
    const repo = await Repository.load(storage, remote);

    await repo.logSession({
      sessionId: session.id,
      feeling: 'dur',
      rpe: 8,
      notes: 'Al gimnàs, sense cobertura',
      exercises: session.exercises.map((exercise) => ({
        plannedExerciseId: exercise.id,
        sets: exercise.strength
          ? Array.from({ length: exercise.strength.sets }, () => ({
              weightKg: exercise.strength!.weightKg,
              reps: exercise.strength!.reps,
            }))
          : null,
        durationSec: exercise.cardio?.durationSec ?? null,
        distanceM: exercise.cardio?.distanceM ?? null,
      })),
    });

    expect(repo.snapshot.sessions.find((item) => item.id === session.id)?.status).toBe('done');
    expect(repo.snapshot.logs.some((log) => log.plannedSessionId === session.id && log.syncStatus === 'pending')).toBe(true);
    expect(pendingOps(repo.queue).some((op) => op.entity === 'session_log')).toBe(true);
    expect(remote.pushes).toBe(0);
    expect(await repo.flush()).toBe('offline');

    await repo.setOffline(false);
    expect(await repo.flush()).toBe('synced');
    expect(pendingOps(repo.queue)).toHaveLength(0);
    expect(repo.snapshot.logs.find((log) => log.plannedSessionId === session.id)?.syncStatus).toBe('synced');
    expect(remote.data?.logs.some((log) => log.plannedSessionId === session.id && log.rpe === 8)).toBe(true);

    const reloaded = await Repository.load(storage, remote);
    expect(reloaded.snapshot.logs.find((log) => log.plannedSessionId === session.id)?.notes).toBe('Al gimnàs, sense cobertura');
  });

  it('si no hi ha canvis pendents, mana la còpia compartida', async () => {
    const storage = new MemoryStorage();
    const seed = buildSeed(new Date(2026, 10, 21));
    storage.snapshot = structuredClone(seed);
    const remote = remoteWith({
      ...seed,
      plans: seed.plans.map((plan, index) => (index === 0 ? { ...plan, name: 'Pla del concentrador' } : plan)),
    });
    const repo = await Repository.load(storage, remote);
    expect(await repo.flush()).toBe('synced');
    expect(repo.snapshot.plans[0].name).toBe('Pla del concentrador');
    expect(repo.snapshot.settings.role).toBeNull();
  });

  it('en sincronitzar conserva el registre pendent si el servidor en té un altre', async () => {
    const storage = new MemoryStorage();
    const seed = buildSeed(new Date(2026, 10, 21));
    storage.snapshot = seed;
    const localLog = seed.logs[0];
    const remote = remoteWith({
      ...seed,
      logs: seed.logs.map((log) =>
        log.id === localLog.id ? { ...log, rpe: 2, syncStatus: 'synced', updatedAt: '2026-12-01T00:00:00.000Z' } : log,
      ),
    });
    const repo = await Repository.load(storage, remote);
    repo.snapshot = {
      ...repo.snapshot,
      logs: repo.snapshot.logs.map((log) =>
        log.id === localLog.id ? { ...log, rpe: 9, syncStatus: 'pending', updatedAt: '2026-11-01T00:00:00.000Z' } : log,
      ),
    };
    repo.queue = [
      {
        id: 'op_local',
        entity: 'session_log',
        entityId: localLog.id,
        op: 'upsert',
        payload: { id: localLog.id },
        createdAt: '2026-11-21T12:00:00.000Z',
        attempts: 0,
        lastError: null,
        status: 'pending',
      },
    ];
    expect(await repo.flush()).toBe('synced');
    expect(repo.snapshot.logs.find((log) => log.id === localLog.id)?.rpe).toBe(9);
    expect(remote.data?.logs.find((log) => log.id === localLog.id)?.rpe).toBe(9);
  });
});
