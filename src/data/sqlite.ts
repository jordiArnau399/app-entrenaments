import * as SQLite from 'expo-sqlite';
import type { SyncOp } from '../domain/sync';
import type { Snapshot } from '../domain/types';
import type { Storage } from './storage';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  op TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  last_error TEXT,
  status TEXT NOT NULL
);
`;

let chain: Promise<unknown> = Promise.resolve();

/** Una sola operació de SQLite alhora. Dues transaccions juntes fan fallar wa-sqlite. */
function queued<T>(work: () => Promise<T>): Promise<T> {
  const run = chain.then(work, work);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

type QueueRow = {
  id: string;
  entity: SyncOp['entity'];
  entity_id: string;
  op: SyncOp['op'];
  payload: string;
  created_at: string;
  attempts: number;
  last_error: string | null;
  status: SyncOp['status'];
};

export async function openSqliteStorage(): Promise<Storage> {
  const db = await SQLite.openDatabaseAsync('ritme.db');
  await db.execAsync(SCHEMA);
  return {
    async loadSnapshot() {
      return queued(async () => {
        const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', 'snapshot');
        return row ? (JSON.parse(row.value) as Snapshot) : null;
      });
    },
    async saveSnapshot(snapshot) {
      await queued(() =>
        db.runAsync(
          'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
          'snapshot',
          JSON.stringify(snapshot),
        ),
      );
    },
    async loadQueue() {
      const rows = await queued(() => db.getAllAsync<QueueRow>('SELECT * FROM sync_queue ORDER BY created_at ASC'));
      return rows.map((row) => ({
        id: row.id,
        entity: row.entity,
        entityId: row.entity_id,
        op: row.op,
        payload: JSON.parse(row.payload) as unknown,
        createdAt: row.created_at,
        attempts: row.attempts,
        lastError: row.last_error,
        status: row.status,
      }));
    },
    async saveQueue(queue) {
      await queued(async () => {
        await db.runAsync('DELETE FROM sync_queue');
        for (const op of queue) {
          await db.runAsync(
            `INSERT INTO sync_queue
              (id, entity, entity_id, op, payload, created_at, attempts, last_error, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            op.id,
            op.entity,
            op.entityId,
            op.op,
            JSON.stringify(op.payload ?? null),
            op.createdAt,
            op.attempts,
            op.lastError,
            op.status,
          );
        }
      });
    },
  };
}

export function openBrowserStorage(): Storage {
  const memory = new Map<string, string>();
  const read = (key: string) => {
    if (typeof localStorage === 'undefined') return memory.get(key) ?? null;
    return localStorage.getItem(key);
  };
  const write = (key: string, value: string) => {
    if (typeof localStorage === 'undefined') memory.set(key, value);
    else localStorage.setItem(key, value);
  };
  return {
    async loadSnapshot() {
      const raw = read('ritme.snapshot');
      return raw ? (JSON.parse(raw) as Snapshot) : null;
    },
    async saveSnapshot(snapshot) {
      write('ritme.snapshot', JSON.stringify(snapshot));
    },
    async loadQueue() {
      const raw = read('ritme.queue');
      return raw ? (JSON.parse(raw) as SyncOp[]) : [];
    },
    async saveQueue(queue) {
      write('ritme.queue', JSON.stringify(queue));
    },
  };
}
