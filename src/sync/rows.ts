import { canAccess, type Actor } from '../domain/access';
import type { AssignedPlan, Exercise, Invite, Message, PlannedSession, SessionLog, Template } from '../domain/types';
import type { SyncOp } from '../domain/sync';

export type CloudRow = {
  id: string;
  trainer_id: string;
  client_id: string | null;
  updated_at: string;
  payload: unknown;
};

export function exerciseToRow(exercise: Exercise): CloudRow {
  return { id: exercise.id, trainer_id: exercise.trainerId, client_id: null, updated_at: exercise.updatedAt, payload: exercise };
}

export function templateToRow(template: Template): CloudRow {
  return { id: template.id, trainer_id: template.trainerId, client_id: null, updated_at: template.updatedAt, payload: template };
}

export function planToRow(plan: AssignedPlan): CloudRow {
  return { id: plan.id, trainer_id: plan.trainerId, client_id: plan.clientId, updated_at: plan.updatedAt, payload: plan };
}

export function sessionToRow(session: PlannedSession): CloudRow {
  return { id: session.id, trainer_id: session.trainerId, client_id: session.clientId, updated_at: session.updatedAt, payload: session };
}

export function logToRow(log: SessionLog): CloudRow {
  return { id: log.id, trainer_id: log.trainerId, client_id: log.clientId, updated_at: log.updatedAt, payload: log };
}

export function messageToRow(message: Message): Record<string, unknown> {
  return {
    id: message.id,
    trainer_id: message.trainerId,
    client_id: message.clientId,
    sender_id: message.senderId,
    body: message.text,
    created_at: message.sentAt,
    read_at: message.readAt,
    updated_at: message.updatedAt,
  };
}

/** Un missatge nou s'insereix. Marcar-lo llegit és un pedaç, perquè l'alta exigeix read_at buit. */
export function messageWrite(row: Record<string, unknown>, actorUserId: string): { method: 'POST' | 'PATCH'; path: string; body: Record<string, unknown>; prefer: string } | null {
  const senderId = String(row.sender_id ?? '');
  if (row.read_at && senderId !== actorUserId) {
    return {
      method: 'PATCH',
      path: `messages?id=eq.${encodeURIComponent(String(row.id))}`,
      body: { read_at: row.read_at },
      prefer: 'return=minimal',
    };
  }
  if (!row.read_at && senderId === actorUserId) {
    return { method: 'POST', path: 'messages', body: row, prefer: 'resolution=ignore-duplicates,return=minimal' };
  }
  return null;
}

export function readMessage(row: {
  id: string;
  trainer_id: string;
  client_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  updated_at: string;
}): Message {
  const readAt = row.read_at;
  return {
    id: row.id,
    trainerId: row.trainer_id,
    clientId: row.client_id,
    senderId: row.sender_id,
    recipientId: row.sender_id === row.trainer_id ? row.client_id : row.trainer_id,
    text: row.body,
    sentAt: row.created_at,
    readAt,
    status: readAt ? 'read' : 'sent',
    syncStatus: 'synced',
    updatedAt: row.updated_at,
  };
}

export function inviteToRow(invite: Invite): Record<string, unknown> {
  return {
    id: invite.id,
    trainer_id: invite.trainerId,
    name: invite.name,
    email: invite.email,
    code: invite.code,
    client_id: invite.clientId,
    used_at: invite.usedAt,
    created_at: invite.createdAt,
    updated_at: invite.updatedAt,
  };
}

export function readExercise(row: CloudRow): Exercise {
  const payload = row.payload as Exercise;
  return { ...payload, id: row.id, trainerId: row.trainer_id, updatedAt: row.updated_at };
}

export function readTemplate(row: CloudRow): Template {
  const payload = row.payload as Template;
  return { ...payload, id: row.id, trainerId: row.trainer_id, updatedAt: row.updated_at };
}

export function readPlan(row: CloudRow): AssignedPlan {
  const payload = row.payload as AssignedPlan;
  return { ...payload, id: row.id, trainerId: row.trainer_id, clientId: row.client_id ?? payload.clientId, updatedAt: row.updated_at };
}

export function readSession(row: CloudRow): PlannedSession {
  const payload = row.payload as PlannedSession;
  return { ...payload, id: row.id, trainerId: row.trainer_id, clientId: row.client_id ?? payload.clientId, updatedAt: row.updated_at };
}

export function readLog(row: CloudRow): SessionLog {
  const payload = row.payload as SessionLog;
  return { ...payload, id: row.id, trainerId: row.trainer_id, clientId: row.client_id ?? payload.clientId, updatedAt: row.updated_at };
}

export function readInvite(row: {
  id: string;
  trainer_id: string;
  name: string;
  email: string;
  code: string;
  client_id: string | null;
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
    clientId: row.client_id,
    usedAt: row.used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TABLE: Partial<Record<SyncOp['entity'], 'exercise' | 'template' | 'plan' | 'session' | 'session_log' | 'invite' | 'message'>> = {
  exercise: 'exercise',
  template: 'template',
  plan: 'plan',
  session: 'session',
  session_log: 'session_log',
  invite: 'invite',
  message: 'message',
};

/** No s'envia al núvol una fila que la política rebutjaria. */
export function opIsAllowed(
  actor: Actor,
  entity: SyncOp['entity'],
  row: { trainerId?: string | null; clientId?: string | null; senderId?: string | null; usedAt?: string | null },
): boolean {
  const table = TABLE[entity];
  if (!table) return false;
  if (table === 'message') {
    return canAccess(actor, 'insert', table, row) || canAccess(actor, 'update', table, row);
  }
  return canAccess(actor, 'insert', table, row);
}
