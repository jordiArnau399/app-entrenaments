import { canAccess, type Actor } from '../domain/access';
import type { AssignedPlan, Exercise, Invite, PlannedSession, SessionLog, Template } from '../domain/types';
import type { SyncOp } from '../domain/sync';

export type CloudRow = {
  id: string;
  trainer_id: string;
  /** Només plans, sessions i registres. Exercicis i plantilles no tenen aquesta columna. */
  client_id?: string | null;
  updated_at: string;
  version?: number;
  payload: unknown;
};

function stamped<T extends { version?: number }>(row: CloudRow, item: T): CloudRow {
  return item.version == null ? row : { ...row, version: item.version };
}

export function exerciseToRow(exercise: Exercise): CloudRow {
  return stamped({ id: exercise.id, trainer_id: exercise.trainerId, updated_at: exercise.updatedAt, payload: exercise }, exercise);
}

export function templateToRow(template: Template): CloudRow {
  return stamped({ id: template.id, trainer_id: template.trainerId, updated_at: template.updatedAt, payload: template }, template);
}

export function planToRow(plan: AssignedPlan): CloudRow {
  return stamped({ id: plan.id, trainer_id: plan.trainerId, client_id: plan.clientId, updated_at: plan.updatedAt, payload: plan }, plan);
}

export function sessionToRow(session: PlannedSession): CloudRow {
  return stamped({ id: session.id, trainer_id: session.trainerId, client_id: session.clientId, updated_at: session.updatedAt, payload: session }, session);
}

export function logToRow(log: SessionLog): CloudRow {
  return stamped({ id: log.id, trainer_id: log.trainerId, client_id: log.clientId, updated_at: log.updatedAt, payload: log }, log);
}

export function inviteToRow(invite: Invite): Record<string, unknown> {
  return {
    id: invite.id,
    trainer_id: invite.trainerId,
    name: invite.name,
    email: invite.email,
    code: invite.code,
    kind: invite.kind ?? 'client',
    client_id: invite.clientId,
    used_at: invite.usedAt,
    created_at: invite.createdAt,
    updated_at: invite.updatedAt,
  };
}

export function readExercise(row: CloudRow): Exercise {
  const payload = row.payload as Exercise;
  return { ...payload, id: row.id, trainerId: row.trainer_id, updatedAt: row.updated_at, version: row.version ?? payload.version };
}

export function readTemplate(row: CloudRow): Template {
  const payload = row.payload as Template;
  return { ...payload, id: row.id, trainerId: row.trainer_id, updatedAt: row.updated_at, version: row.version ?? payload.version };
}

export function readPlan(row: CloudRow): AssignedPlan {
  const payload = row.payload as AssignedPlan;
  return { ...payload, id: row.id, trainerId: row.trainer_id, clientId: row.client_id ?? payload.clientId, updatedAt: row.updated_at, version: row.version ?? payload.version };
}

export function readSession(row: CloudRow): PlannedSession {
  const payload = row.payload as PlannedSession;
  return { ...payload, id: row.id, trainerId: row.trainer_id, clientId: row.client_id ?? payload.clientId, updatedAt: row.updated_at, version: row.version ?? payload.version };
}

export function readLog(row: CloudRow): SessionLog {
  const payload = row.payload as SessionLog;
  return { ...payload, id: row.id, trainerId: row.trainer_id, clientId: row.client_id ?? payload.clientId, updatedAt: row.updated_at, version: row.version ?? payload.version };
}

export function readInvite(row: {
  id: string;
  trainer_id: string;
  name: string;
  email: string;
  code: string;
  client_id: string | null;
  kind?: string | null;
  used_at: string | null;
  created_at: string;
  updated_at: string;
}): Invite {
  return {
    id: row.id,
    trainerId: row.trainer_id,
    name: row.name,
    email: row.email,
    code: row.code,
    kind: row.kind === 'trainer' ? 'trainer' : 'client',
    clientId: row.client_id,
    usedAt: row.used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TABLE: Partial<Record<SyncOp['entity'], 'exercise' | 'template' | 'plan' | 'session' | 'session_log' | 'invite'>> = {
  exercise: 'exercise',
  template: 'template',
  plan: 'plan',
  session: 'session',
  session_log: 'session_log',
  invite: 'invite',
};

/**
 * Un canvi es pot enviar si la política deixa inserir-lo o actualitzar-lo.
 * El client no crea sessions, però sí que en marca de fetes: això és un pedaç, no una alta.
 */
export function opIsAllowed(actor: Actor, entity: SyncOp['entity'], row: { trainerId?: string | null; clientId?: string | null; usedAt?: string | null }): boolean {
  const table = TABLE[entity];
  if (!table) return false;
  return canAccess(actor, 'insert', table, row) || canAccess(actor, 'update', table, row);
}

/** El client actualitza la sessió amb PATCH. Un POST d'alta el rebutjaria la política. */
export function cloudWriteMethod(actor: Actor, entity: SyncOp['entity'], op: SyncOp['op']): 'POST' | 'PATCH' | 'DELETE' {
  if (op === 'delete') return 'DELETE';
  if (actor.role === 'client' && entity === 'session') return 'PATCH';
  return 'POST';
}
