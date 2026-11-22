import type { CloudBundle, ProfileRecord } from '../domain/account';
import type { Actor } from '../domain/access';
import type { Snapshot } from '../domain/types';
import type { SyncOp } from '../domain/sync';
import { freshAuth, supabaseConfig, type AuthSession } from './auth';
import {
  exerciseToRow,
  inviteToRow,
  logToRow,
  cloudWriteMethod,
  opIsAllowed,
  planToRow,
  readExercise,
  readInvite,
  readLog,
  readPlan,
  readSession,
  readTemplate,
  sessionToRow,
  templateToRow,
  type CloudRow,
} from './rows';

type InviteRow = Parameters<typeof readInvite>[0];

async function token(): Promise<AuthSession> {
  const session = await freshAuth();
  if (!session) throw new Error('Cal tornar a entrar');
  return session;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const config = supabaseConfig();
  if (!config) throw new Error('Supabase no està configurat');
  const session = await token();
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  const body = text ? (JSON.parse(text) as T & { message?: string }) : undefined;
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'message' in body ? String(body.message) : text;
    throw new Error(message || 'Supabase ha rebutjat la petició');
  }
  return body as T;
}

function actorOf(snapshot: Snapshot): Actor | null {
  const userId = snapshot.settings.userId;
  const role = snapshot.settings.role;
  const trainerId = snapshot.settings.trainerId;
  if (!userId || (role !== 'trainer' && role !== 'client' && role !== 'admin') || !trainerId) return null;
  return { userId, role, trainerId };
}

const PAGE = 1000;

async function pullPages<T>(path: string, cursor?: string): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;
  const since = cursor ? `&updated_at=gt.${encodeURIComponent(cursor)}` : '';
  for (;;) {
    const batch = await request<T[]>(`${path}${path.includes('?') ? '&' : '?'}select=*&order=updated_at.asc${since}`, {
      headers: { Range: `${offset}-${offset + PAGE - 1}` },
    });
    const page = batch ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return rows;
}

export async function pullCloud(cursors?: Record<string, string>, incremental = false): Promise<CloudBundle> {
  const cursor = (table: string) => (incremental ? cursors?.[table] : undefined);
  const [profiles, invites, exercises, templates, plans, sessions, logs] = await Promise.all([
    pullPages<Record<string, string | null>>('profiles', cursor('profiles')),
    pullPages<InviteRow>('invites', cursor('invites')),
    pullPages<CloudRow>('exercises', cursor('exercises')),
    pullPages<CloudRow>('templates', cursor('templates')),
    pullPages<CloudRow>('plans', cursor('plans')),
    pullPages<CloudRow>('sessions', cursor('sessions')),
    pullPages<CloudRow>('session_logs', cursor('session_logs')),
  ]);
  return {
    profiles: (profiles ?? []).map(readProfile),
    invites: (invites ?? []).map(readInvite),
    exercises: (exercises ?? []).map(readExercise),
    templates: (templates ?? []).map(readTemplate),
    plans: (plans ?? []).map(readPlan),
    sessions: (sessions ?? []).map(readSession),
    logs: (logs ?? []).map(readLog),
  };
}

function readProfile(row: Record<string, string | null>): ProfileRecord {
  return {
    id: row.id ?? '',
    role: row.role === 'client' ? 'client' : row.role === 'admin' ? 'admin' : 'trainer',
    name: row.name ?? '',
    email: row.email ?? '',
    trainerId: row.trainer_id,
    status: row.status === 'inactive' ? 'inactive' : 'active',
    timezone: row.timezone,
    language: row.language === 'es' || row.language === 'en' || row.language === 'ca' ? row.language : null,
    version: Number(row.version ?? 1) || 1,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

const SQL_TABLE: Partial<Record<SyncOp['entity'], string>> = {
  exercise: 'exercises',
  template: 'templates',
  plan: 'plans',
  session: 'sessions',
  session_log: 'session_logs',
  invite: 'invites',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function pushCloud(snapshot: Snapshot, ops: SyncOp[]): Promise<void> {
  const actor = actorOf(snapshot);
  if (!actor) throw new Error('Torna a entrar per desar els canvis al núvol');
  for (const op of ops) {
    if (op.entity === 'profile') {
      await pushProfile(snapshot, op);
      continue;
    }
    const table = SQL_TABLE[op.entity];
    if (!table) continue;
    if (op.op === 'delete') {
      await request(`${table}?id=eq.${encodeURIComponent(op.entityId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      continue;
    }
    const row = rowFor(snapshot, op);
    if (!row) continue;
    for (const key of ['trainer_id', 'client_id', 'sender_id'] as const) {
      const value = row[key];
      if (typeof value === 'string' && value.length > 0 && !UUID.test(value)) {
        throw new Error('Això és una dada de la demostració i el compte real no l’accepta.');
      }
    }
    const scope = {
      trainerId: String(row.trainer_id ?? ''),
      clientId: (row.client_id as string | null) ?? null,
      usedAt: (row.used_at as string | null) ?? null,
    };
    if (!opIsAllowed(actor, op.entity, scope)) {
      throw new Error('new row violates row-level security policy');
    }
    const method = cloudWriteMethod(actor, op.entity, op.op);
    if (method === 'PATCH') {
      await request(`${table}?id=eq.${encodeURIComponent(op.entityId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(row),
      });
      continue;
    }
    await request(table, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(row),
    });
  }
}

async function pushProfile(snapshot: Snapshot, op: SyncOp): Promise<void> {
  const trainer = snapshot.trainers.find((item) => item.id === op.entityId);
  const client = snapshot.clients.find((item) => item.id === op.entityId);
  const person = trainer ?? client;
  if (!person) return;
  const body: Record<string, unknown> = {};
  if (person.status) body.status = person.status;
  if (client) body.trainer_id = client.trainerId;
  if (person.timezone) body.timezone = person.timezone;
  if (person.language) body.language = person.language;
  if (person.version != null) body.version = person.version;
  await request(`profiles?id=eq.${encodeURIComponent(op.entityId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
}

function rowFor(snapshot: Snapshot, op: SyncOp): Record<string, unknown> | null {
  if (op.entity === 'exercise') {
    const item = snapshot.exercises.find((entry) => entry.id === op.entityId);
    return item ? exerciseToRow(item) : null;
  }
  if (op.entity === 'template') {
    const item = snapshot.templates.find((entry) => entry.id === op.entityId);
    return item ? templateToRow(item) : null;
  }
  if (op.entity === 'plan') {
    const item = snapshot.plans.find((entry) => entry.id === op.entityId);
    return item ? planToRow(item) : null;
  }
  if (op.entity === 'session') {
    const item = snapshot.sessions.find((entry) => entry.id === op.entityId);
    return item ? sessionToRow(item) : null;
  }
  if (op.entity === 'session_log') {
    const item = snapshot.logs.find((entry) => entry.id === op.entityId);
    return item ? logToRow(item) : null;
  }
  if (op.entity === 'invite') {
    const item = (snapshot.invites ?? []).find((entry) => entry.id === op.entityId);
    return item ? inviteToRow(item) : null;
  }
  return null;
}
