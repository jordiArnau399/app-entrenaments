import type { CloudBundle, ProfileRecord } from '../domain/account';
import type { Actor } from '../domain/access';
import type { Snapshot } from '../domain/types';
import type { SyncOp } from '../domain/sync';
import { freshAuth, supabaseConfig, type AuthSession } from './auth';
import {
  exerciseToRow,
  inviteToRow,
  logToRow,
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
  if (!userId || (role !== 'trainer' && role !== 'client') || !trainerId) return null;
  return { userId, role, trainerId };
}

export async function pullCloud(): Promise<CloudBundle> {
  const [profiles, invites, exercises, templates, plans, sessions, logs] = await Promise.all([
    request<Array<Record<string, string | null>>>('profiles?select=*'),
    request<InviteRow[]>('invites?select=*'),
    request<CloudRow[]>('exercises?select=*'),
    request<CloudRow[]>('templates?select=*'),
    request<CloudRow[]>('plans?select=*'),
    request<CloudRow[]>('sessions?select=*'),
    request<CloudRow[]>('session_logs?select=*'),
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
    role: row.role === 'client' ? 'client' : 'trainer',
    name: row.name ?? '',
    email: row.email ?? '',
    trainerId: row.trainer_id,
    status: row.status === 'inactive' ? 'inactive' : 'active',
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

export async function pushCloud(snapshot: Snapshot, ops: SyncOp[]): Promise<void> {
  const actor = actorOf(snapshot);
  if (!actor) {
    if (ops.some((op) => op.entity === 'invite')) throw new Error('Torna a entrar per desar el codi d’invitació');
    return;
  }
  for (const op of ops) {
    const table = SQL_TABLE[op.entity];
    if (!table) continue;
    if (op.op === 'delete') {
      await request(`${table}?id=eq.${encodeURIComponent(op.entityId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      continue;
    }
    const row = rowFor(snapshot, op);
    if (!row) continue;
    const scope = {
      trainerId: String(row.trainer_id ?? ''),
      clientId: (row.client_id as string | null) ?? null,
      usedAt: (row.used_at as string | null) ?? null,
    };
    if (!opIsAllowed(actor, op.entity, scope)) {
      if (op.entity === 'invite') throw new Error('No s’ha pogut desar el codi d’invitació');
      continue;
    }
    await request(table, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(row),
    });
  }
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
