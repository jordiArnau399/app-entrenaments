import { addPlanExercise, assignTemplate, pauseOtherPlans, removePlanExercise, updatePlanTarget } from '../domain/assignPlan';
import { createId, createIdFactory } from '../domain/ids';
import { createSessionLog, type LogDraftExercise } from '../domain/sessionLog';
import { buildSeed } from '../domain/seed';
import { applyPendingDeletes, enqueue, pendingOps, toCollections, mergeSnapshots, type SyncOp } from '../domain/sync';
import type { CardioTarget, DataCollections, Exercise, SessionFeeling, Snapshot, StrengthTarget, Template } from '../domain/types';
import type { Storage } from './storage';

export interface RemoteStore {
  name: 'hub' | 'supabase';
  pull(): Promise<DataCollections | null>;
  push(data: DataCollections): Promise<void>;
}

export class Repository {
  flushing = false;

  constructor(
    private storage: Storage,
    public snapshot: Snapshot,
    public queue: SyncOp[],
    public remote: RemoteStore | null = null,
  ) {}

  static async load(storage: Storage, remote: RemoteStore | null = null): Promise<Repository> {
    let snapshot = await storage.loadSnapshot();
    let queue = await storage.loadQueue();
    if (!snapshot) {
      snapshot = buildSeed(new Date());
      queue = [];
      await storage.saveSnapshot(snapshot);
      await storage.saveQueue(queue);
    }
    return new Repository(storage, snapshot, queue, remote);
  }

  private async persist(): Promise<void> {
    await this.storage.saveSnapshot(this.snapshot);
    await this.storage.saveQueue(this.queue);
  }

  private touchQueue(entity: SyncOp['entity'], entityId: string, op: SyncOp['op'] = 'upsert'): void {
    this.queue = enqueue(this.queue, {
      id: createId('op'),
      entity,
      entityId,
      op,
      payload: { id: entityId },
      createdAt: new Date().toISOString(),
    });
  }

  async setProfile(role: 'trainer' | 'client' | null, clientId: string | null): Promise<void> {
    this.snapshot = {
      ...this.snapshot,
      settings: {
        ...this.snapshot.settings,
        role,
        trainerId: this.snapshot.trainers[0]?.id ?? null,
        clientId,
      },
    };
    await this.persist();
  }

  async setOffline(offline: boolean): Promise<void> {
    this.snapshot = {
      ...this.snapshot,
      settings: { ...this.snapshot.settings, offline },
    };
    await this.persist();
    if (!offline) await this.flush();
  }

  async setReminderTime(reminderTime: string): Promise<void> {
    this.snapshot = {
      ...this.snapshot,
      settings: { ...this.snapshot.settings, reminderTime },
    };
    await this.persist();
  }

  async resetDemo(): Promise<void> {
    const deviceId = this.snapshot.settings.deviceId;
    this.snapshot = buildSeed(new Date());
    this.snapshot = {
      ...this.snapshot,
      settings: { ...this.snapshot.settings, deviceId },
    };
    this.queue = [];
    await this.persist();
    if (this.remote) await this.remote.push(toCollections(this.snapshot));
  }

  async addClient(name: string, email: string): Promise<string> {
    const id = createId('cli');
    const stamp = new Date().toISOString();
    const trainerId = this.snapshot.trainers[0].id;
    this.snapshot = {
      ...this.snapshot,
      clients: [
        ...this.snapshot.clients,
        { id, trainerId, name: name.trim(), email: email.trim(), status: 'active', createdAt: stamp, updatedAt: stamp },
      ],
    };
    this.touchQueue('client', id);
    await this.persist();
    await this.flush();
    return id;
  }

  async saveExercise(input: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt' | 'trainerId'> & { id?: string }): Promise<string> {
    const stamp = new Date().toISOString();
    const trainerId = this.snapshot.trainers[0].id;
    const existing = input.id ? this.snapshot.exercises.find((exercise) => exercise.id === input.id) : undefined;
    const id = existing?.id ?? createId('ex');
    const exercise: Exercise = {
      id,
      trainerId,
      name: input.name.trim(),
      type: input.type,
      category: input.category.trim() || 'General',
      description: input.description.trim(),
      imageUrl: input.imageUrl?.trim() ? input.imageUrl.trim() : null,
      videoUrl: existing?.videoUrl ?? null,
      createdAt: existing?.createdAt ?? stamp,
      updatedAt: stamp,
    };
    this.snapshot = {
      ...this.snapshot,
      exercises: existing
        ? this.snapshot.exercises.map((item) => (item.id === id ? exercise : item))
        : [...this.snapshot.exercises, exercise],
    };
    this.touchQueue('exercise', id);
    await this.persist();
    await this.flush();
    return id;
  }

  async deleteExercise(id: string): Promise<void> {
    const used = this.snapshot.templates.some((template) =>
      template.days.some((day) => day.exercises.some((item) => item.exerciseId === id)),
    ) || this.snapshot.plans.some((plan) => plan.days.some((day) => day.exercises.some((item) => item.exerciseId === id)));
    if (used) throw new Error('Aquest exercici és dins d’una plantilla o d’un pla. Treu-lo abans d’esborrar-lo.');
    this.snapshot = {
      ...this.snapshot,
      exercises: this.snapshot.exercises.filter((exercise) => exercise.id !== id),
    };
    this.touchQueue('exercise', id, 'delete');
    await this.persist();
    await this.flush();
  }

  async saveTemplate(draft: Template): Promise<string> {
    const stamp = new Date().toISOString();
    const existing = this.snapshot.templates.find((template) => template.id === draft.id);
    const id = existing?.id ?? createId('tpl');
    const template: Template = {
      ...draft,
      id,
      trainerId: this.snapshot.trainers[0].id,
      name: draft.name.trim(),
      description: draft.description.trim(),
      createdAt: existing?.createdAt ?? stamp,
      updatedAt: stamp,
      days: draft.days.map((day) => ({
        ...day,
        exercises: day.exercises.map((item) => ({
          ...item,
          strength: item.strength ? { ...item.strength } : null,
          cardio: item.cardio ? { ...item.cardio } : null,
        })),
      })),
    };
    this.snapshot = {
      ...this.snapshot,
      templates: existing
        ? this.snapshot.templates.map((item) => (item.id === id ? template : item))
        : [...this.snapshot.templates, template],
    };
    this.touchQueue('template', id);
    await this.persist();
    await this.flush();
    return id;
  }

  async assign(input: { templateId: string; clientId: string; startDate: string; weeks: number }): Promise<string> {
    const template = this.snapshot.templates.find((item) => item.id === input.templateId);
    if (!template) throw new Error('No s’ha trobat la plantilla');
    const stamp = new Date().toISOString();
    const assigned = assignTemplate({
      template,
      clientId: input.clientId,
      trainerId: this.snapshot.trainers[0].id,
      startDate: input.startDate,
      weeks: input.weeks,
      nowIso: stamp,
    });
    this.snapshot = {
      ...this.snapshot,
      plans: [...pauseOtherPlans(this.snapshot.plans, input.clientId, assigned.plan.id, stamp), assigned.plan],
      sessions: [...this.snapshot.sessions, ...assigned.sessions],
    };
    this.touchQueue('plan', assigned.plan.id);
    await this.persist();
    await this.flush();
    return assigned.plan.id;
  }

  async updatePlanExercise(
    planId: string,
    itemId: string,
    patch: { strength?: StrengthTarget | null; cardio?: CardioTarget | null; notes?: string },
  ): Promise<void> {
    const plan = this.snapshot.plans.find((item) => item.id === planId);
    if (!plan) throw new Error('No s’ha trobat el pla');
    const updated = updatePlanTarget({
      plan,
      sessions: this.snapshot.sessions,
      itemId,
      today: localToday(),
      nowIso: new Date().toISOString(),
      ...patch,
    });
    this.replacePlan(updated.plan, updated.sessions);
  }

  async addExerciseToPlan(planId: string, dayId: string, exerciseId: string): Promise<void> {
    const plan = this.snapshot.plans.find((item) => item.id === planId);
    const exercise = this.snapshot.exercises.find((item) => item.id === exerciseId);
    if (!plan || !exercise) throw new Error('No s’ha trobat el pla o l’exercici');
    const updated = addPlanExercise({
      plan,
      sessions: this.snapshot.sessions,
      dayId,
      exerciseId,
      strength: exercise.type === 'strength' ? { sets: 3, reps: 8, weightKg: 20 } : null,
      cardio: exercise.type === 'cardio' ? { durationSec: 20 * 60, distanceM: 3000, paceSecPerKm: 400 } : null,
      today: localToday(),
      nowIso: new Date().toISOString(),
      ids: createIdFactory(),
    });
    this.replacePlan(updated.plan, updated.sessions);
  }

  async removeExerciseFromPlan(planId: string, itemId: string): Promise<void> {
    const plan = this.snapshot.plans.find((item) => item.id === planId);
    if (!plan) throw new Error('No s’ha trobat el pla');
    const updated = removePlanExercise({
      plan,
      sessions: this.snapshot.sessions,
      itemId,
      today: localToday(),
      nowIso: new Date().toISOString(),
    });
    this.replacePlan(updated.plan, updated.sessions);
  }

  private async replacePlan(plan: Snapshot['plans'][number], sessions: Snapshot['sessions']): Promise<void> {
    const sessionIds = new Set(sessions.filter((session) => session.planId === plan.id).map((session) => session.id));
    this.snapshot = {
      ...this.snapshot,
      plans: this.snapshot.plans.map((item) => (item.id === plan.id ? plan : item)),
      sessions: [
        ...this.snapshot.sessions.filter((session) => session.planId !== plan.id),
        ...sessions.filter((session) => sessionIds.has(session.id)),
      ],
    };
    this.touchQueue('plan', plan.id);
    await this.persist();
    await this.flush();
  }

  async skipSession(sessionId: string): Promise<void> {
    const session = this.snapshot.sessions.find((item) => item.id === sessionId);
    if (!session) throw new Error('No s’ha trobat la sessió');
    if (session.status === 'done') throw new Error('Aquesta sessió ja està feta');
    const stamp = new Date().toISOString();
    this.snapshot = {
      ...this.snapshot,
      sessions: this.snapshot.sessions.map((item) =>
        item.id === sessionId ? { ...item, status: 'skipped', updatedAt: stamp } : item,
      ),
    };
    this.touchQueue('session', sessionId);
    await this.persist();
    if (!this.snapshot.settings.offline) await this.flush();
  }

  async logSession(input: {
    sessionId: string;
    exercises: LogDraftExercise[];
    feeling: SessionFeeling;
    rpe: number;
    notes: string;
  }): Promise<string> {
    const session = this.snapshot.sessions.find((item) => item.id === input.sessionId);
    if (!session) throw new Error('No s’ha trobat la sessió');
    const existing = this.snapshot.logs.find((log) => log.plannedSessionId === session.id);
    if (existing) throw new Error('Aquesta sessió ja està registrada');
    const stamp = new Date().toISOString();
    const created = createSessionLog({
      session,
      exercises: input.exercises,
      feeling: input.feeling,
      rpe: input.rpe,
      notes: input.notes,
      deviceId: this.snapshot.settings.deviceId,
      endedAt: stamp,
      ids: createIdFactory(),
    });
    this.snapshot = {
      ...this.snapshot,
      logs: [...this.snapshot.logs, created.log],
      sessions: this.snapshot.sessions.map((item) => (item.id === created.session.id ? created.session : item)),
    };
    this.touchQueue('session_log', created.log.id);
    await this.persist();
    if (!this.snapshot.settings.offline) await this.flush();
    return created.log.id;
  }

  async flush(): Promise<'synced' | 'offline' | 'local' | 'error'> {
    if (this.snapshot.settings.offline) return 'offline';
    if (!this.remote || this.flushing) return this.remote ? 'synced' : 'local';
    this.flushing = true;
    const hadPending = pendingOps(this.queue).length > 0;
    try {
      const remoteData = await this.remote.pull();
      const untouched = pendingOps(this.queue).length === 0;
      if (remoteData && remoteData.clients.length > 0 && untouched) {
        this.snapshot = { ...this.snapshot, ...remoteData };
      } else {
        this.snapshot = mergeSnapshots(this.snapshot, remoteData);
        this.snapshot = applyPendingDeletes(this.snapshot, this.queue);
      }
      const pendingIds = new Set(pendingOps(this.queue).map((op) => op.entityId));
      const collections = toCollections(this.snapshot);
      collections.logs = collections.logs.map((log) =>
        log.syncStatus === 'pending' && pendingIds.has(log.id) ? { ...log, syncStatus: 'synced' } : log,
      );
      await this.remote.push(collections);
      this.queue = this.queue.map((op) =>
        op.status === 'pending' || op.status === 'failed' ? { ...op, status: 'synced', lastError: null } : op,
      );
      this.snapshot = { ...this.snapshot, logs: collections.logs };
      await this.persist();
      return 'synced';
    } catch (error) {
      if (hadPending) {
        const message = error instanceof Error ? error.message : 'Error de sincronització';
        this.queue = this.queue.map((op) => {
          if (op.status !== 'pending' && op.status !== 'failed') return op;
          const attempts = op.attempts + 1;
          return { ...op, attempts, lastError: message, status: attempts >= 5 ? 'failed' : 'pending' };
        });
        await this.storage.saveQueue(this.queue);
      }
      return 'error';
    } finally {
      this.flushing = false;
    }
  }
}

function localToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
