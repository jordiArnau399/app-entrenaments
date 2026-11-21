import type { DataCollections, SessionLog, Snapshot } from './types';

export type SyncEntity =
  | 'trainer'
  | 'client'
  | 'exercise'
  | 'template'
  | 'plan'
  | 'session'
  | 'session_log'
  | 'invite'
  | 'message'
  | 'notification';

export type SyncOp = {
  id: string;
  entity: SyncEntity;
  entityId: string;
  op: 'upsert' | 'delete';
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastError: string | null;
  status: 'pending' | 'synced' | 'failed';
};

export type SyncDraft = Omit<SyncOp, 'attempts' | 'lastError' | 'status'>;

/** Una operació pendent nova substitueix la pendent anterior de la mateixa entitat. */
export function enqueue(queue: SyncOp[], draft: SyncDraft): SyncOp[] {
  const rest = queue.filter(
    (op) =>
      !(
        op.entity === draft.entity &&
        op.entityId === draft.entityId &&
        (op.status === 'pending' || op.status === 'failed')
      ),
  );
  return [
    ...rest,
    {
      ...draft,
      attempts: 0,
      lastError: null,
      status: 'pending',
    },
  ];
}

export function pendingOps(queue: SyncOp[]): SyncOp[] {
  return queue.filter((op) => op.status === 'pending' || op.status === 'failed');
}

export async function processQueue(
  queue: SyncOp[],
  send: (op: SyncOp) => Promise<void>,
  opts?: { maxAttempts?: number },
): Promise<{ queue: SyncOp[]; syncedIds: string[]; failedIds: string[] }> {
  const maxAttempts = opts?.maxAttempts ?? 5;
  const next: SyncOp[] = [];
  const syncedIds: string[] = [];
  const failedIds: string[] = [];
  for (const op of queue) {
    if (op.status === 'synced' || (op.status === 'failed' && op.attempts >= maxAttempts)) {
      next.push(op);
      continue;
    }
    try {
      await send(op);
      next.push({ ...op, status: 'synced', lastError: null });
      syncedIds.push(op.id);
    } catch (error) {
      const attempts = op.attempts + 1;
      const failed = attempts >= maxAttempts;
      next.push({
        ...op,
        attempts,
        lastError: error instanceof Error ? error.message : 'Error de sincronització',
        status: failed ? 'failed' : 'pending',
      });
      failedIds.push(op.id);
    }
  }
  return { queue: next, syncedIds, failedIds };
}

export type RecordOrigin = 'client' | 'trainer' | 'server';

export type VersionedRecord = {
  origin: RecordOrigin;
  updatedAt: string;
  value: string;
};

/**
 * El registre del client preval sobre el seu propi registre.
 * El pla de l'entrenador preval sobre el pla.
 * Si les dues còpies tenen el mateix origen, guanya la més nova.
 */
export function resolveSyncConflict(
  entity: 'session_log' | 'plan',
  current: VersionedRecord,
  incoming: VersionedRecord,
): VersionedRecord {
  const latest = current.updatedAt >= incoming.updatedAt ? current : incoming;
  if (entity === 'session_log') {
    const clientCopies = [current, incoming].filter((record) => record.origin === 'client');
    if (clientCopies.length === 1) return clientCopies[0];
    return latest;
  }
  const trainerCopies = [current, incoming].filter((record) => record.origin === 'trainer');
  if (trainerCopies.length === 1) return trainerCopies[0];
  return latest;
}

function latestByUpdatedAt<T extends { id: string; updatedAt: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of remote) map.set(item.id, item);
  for (const item of local) {
    const other = map.get(item.id);
    if (!other || item.updatedAt >= other.updatedAt) map.set(item.id, item);
  }
  return [...map.values()];
}

function mergeSessions(local: Snapshot['sessions'], remote: Snapshot['sessions']): Snapshot['sessions'] {
  const map = new Map(remote.map((session) => [session.id, session]));
  for (const session of local) {
    const other = map.get(session.id);
    if (!other) {
      map.set(session.id, session);
      continue;
    }
    if (session.status === 'done' && other.status !== 'done') {
      map.set(session.id, session);
      continue;
    }
    if (other.status === 'done' && session.status !== 'done') {
      map.set(session.id, other);
      continue;
    }
    map.set(session.id, session.updatedAt >= other.updatedAt ? session : other);
  }
  return [...map.values()];
}

/** Un registre pendent al dispositiu del client guanya encara que el servidor tingui una data més nova. */
function mergeLogs(local: SessionLog[], remote: SessionLog[]): SessionLog[] {
  const map = new Map(remote.map((log) => [log.id, log]));
  for (const log of local) {
    const other = map.get(log.id);
    if (!other || log.syncStatus === 'pending') {
      map.set(log.id, log);
      continue;
    }
    map.set(log.id, log.updatedAt >= other.updatedAt ? log : other);
  }
  return [...map.values()];
}

export function mergeSnapshots(local: Snapshot, remote: DataCollections | null): Snapshot {
  if (!remote) return local;
  return {
    ...local,
    trainers: latestByUpdatedAt(local.trainers, remote.trainers),
    clients: latestByUpdatedAt(local.clients, remote.clients),
    exercises: latestByUpdatedAt(local.exercises, remote.exercises),
    templates: latestByUpdatedAt(local.templates, remote.templates),
    plans: latestByUpdatedAt(local.plans, remote.plans),
    sessions: mergeSessions(local.sessions, remote.sessions),
    logs: mergeLogs(local.logs, remote.logs),
    invites: latestByUpdatedAt(local.invites ?? [], remote.invites ?? []),
    messages: latestByUpdatedAt(local.messages ?? [], remote.messages ?? []),
    notifications: latestById(local.notifications, remote.notifications),
  };
}

function latestById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of remote) map.set(item.id, item);
  for (const item of local) map.set(item.id, item);
  return [...map.values()];
}

const DELETE_COLLECTION: Partial<Record<SyncEntity, keyof DataCollections>> = {
  exercise: 'exercises',
  template: 'templates',
  client: 'clients',
  plan: 'plans',
  session: 'sessions',
  session_log: 'logs',
  invite: 'invites',
  message: 'messages',
  notification: 'notifications',
};

export function applyPendingDeletes(snapshot: Snapshot, queue: SyncOp[]): Snapshot {
  const next: Snapshot = {
    ...snapshot,
    trainers: snapshot.trainers.slice(),
    clients: snapshot.clients.slice(),
    exercises: snapshot.exercises.slice(),
    templates: snapshot.templates.slice(),
    plans: snapshot.plans.slice(),
    sessions: snapshot.sessions.slice(),
    logs: snapshot.logs.slice(),
    invites: (snapshot.invites ?? []).slice(),
    messages: snapshot.messages.slice(),
    notifications: snapshot.notifications.slice(),
  };
  for (const op of queue) {
    if (op.op !== 'delete' || (op.status !== 'pending' && op.status !== 'failed')) continue;
    const key = DELETE_COLLECTION[op.entity];
    if (!key) continue;
    const list = next[key] as { id: string }[];
    (next[key] as { id: string }[]) = list.filter((item) => item.id !== op.entityId);
  }
  return next;
}

export function toCollections(snapshot: Snapshot): DataCollections {
  return {
    trainers: snapshot.trainers,
    clients: snapshot.clients,
    exercises: snapshot.exercises,
    templates: snapshot.templates,
    plans: snapshot.plans,
    sessions: snapshot.sessions,
    logs: snapshot.logs,
    invites: snapshot.invites ?? [],
    messages: snapshot.messages,
    notifications: snapshot.notifications,
  };
}
