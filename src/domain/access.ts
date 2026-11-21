/**
 * Mateixes regles que les polítiques Row Level Security de
 * supabase/migrations/20261121120000_accounts.sql.
 * El servidor les imposa. Aquí es proven sense una base de dades.
 */

export type Actor = {
  userId: string;
  role: 'trainer' | 'client';
  trainerId: string;
};

export type AccessTable = 'profile' | 'invite' | 'exercise' | 'template' | 'plan' | 'session' | 'session_log';

export type AccessRow = {
  ownerId?: string | null;
  trainerId?: string | null;
  clientId?: string | null;
  usedAt?: string | null;
};

export type AccessAction = 'select' | 'insert' | 'update' | 'delete';

export function canAccess(actor: Actor, action: AccessAction, table: AccessTable, row: AccessRow): boolean {
  const ownTrainer = actor.role === 'trainer' && row.trainerId === actor.userId;
  const ownClient = actor.role === 'client' && row.clientId === actor.userId && row.trainerId === actor.trainerId;
  const seesLibrary = row.trainerId === actor.trainerId;

  if (table === 'profile') {
    const isSelf = row.ownerId === actor.userId;
    const isOwnClient = actor.role === 'trainer' && row.trainerId === actor.userId;
    const isMyTrainer = actor.role === 'client' && row.ownerId === actor.trainerId;
    if (action === 'select') return isSelf || isOwnClient || isMyTrainer;
    if (action === 'update') return isSelf;
    return false;
  }

  if (table === 'invite') {
    if (actor.role !== 'trainer' || row.trainerId !== actor.userId) return false;
    if (action === 'insert') return row.clientId == null && row.usedAt == null;
    return action === 'select' || action === 'update' || action === 'delete';
  }

  if (table === 'exercise' || table === 'template') {
    if (action === 'select') return seesLibrary;
    return ownTrainer;
  }

  if (table === 'plan') {
    if (action === 'select') return ownTrainer || row.clientId === actor.userId;
    return ownTrainer && row.clientId != null;
  }

  if (table === 'session') {
    if (action === 'select') return ownTrainer || row.clientId === actor.userId;
    if (action === 'insert' || action === 'delete') return ownTrainer && row.clientId != null;
    return ownTrainer || ownClient;
  }

  if (action === 'select') return ownTrainer || row.clientId === actor.userId;
  if (action === 'delete') return actor.role === 'client' && row.clientId === actor.userId;
  return ownClient;
}

export function createInviteCode(random: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(random() * alphabet.length)] ?? 'A';
  }
  return code;
}

export type InviteClaim = {
  code: string;
  usedAt: string | null;
};

/** Un codi només es pot fer servir una vegada, sense distingir majúscules. */
export function findOpenInvite<T extends InviteClaim>(invites: T[], code: string): T | null {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) return null;
  return invites.find((invite) => invite.code.toUpperCase() === normalized && invite.usedAt == null) ?? null;
}
