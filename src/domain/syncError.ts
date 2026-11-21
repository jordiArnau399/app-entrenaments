import type { SyncEntity, SyncOp } from './sync';

const TITLE: Record<SyncEntity, string> = {
  plan: 'Pla',
  session: 'Sessió',
  exercise: 'Exercici',
  template: 'Plantilla',
  invite: 'Invitació',
  session_log: 'Registre',
  client: 'Client',
  trainer: 'Entrenador',
  message: 'Missatge',
  notification: 'Avís',
};

/** El text que veu l'entrenador quan Supabase rebutja un element de la cua. */
export function explainSyncError(raw: string): string {
  const text = raw.trim();
  if (/row-level security/i.test(text)) {
    return 'Supabase ha rebutjat aquest canvi: no és del teu compte, o el client no és teu.';
  }
  if (/invalid input syntax for type uuid/i.test(text) || /dada de la demostració/i.test(text)) {
    return 'Això és una dada de la demostració i el compte real no l’accepta.';
  }
  if (/JWT expired|Invalid JWT|PGRST301/i.test(text)) {
    return 'La sessió ha caducat. Tanca-la i torna a entrar.';
  }
  if (/Could not find the '.+' column/i.test(text)) {
    return `Falta una columna a Supabase. ${text}`;
  }
  if (!text) return 'Supabase ha rebutjat el canvi sense dir per què.';
  return `Supabase diu: ${text}`;
}

export function syncItemTitle(op: Pick<SyncOp, 'entity' | 'entityId'>): string {
  return `${TITLE[op.entity]} · ${op.entityId.slice(0, 8)}`;
}

export function syncProblems(queue: SyncOp[]): { id: string; title: string; detail: string }[] {
  return queue
    .filter((op) => (op.status === 'pending' || op.status === 'failed') && op.lastError)
    .map((op) => ({ id: op.id, title: syncItemTitle(op), detail: op.lastError ?? '' }));
}

const ORDER: SyncEntity[] = ['invite', 'exercise', 'template', 'plan', 'session', 'session_log', 'client', 'trainer', 'message', 'notification'];

/** Plans i invitacions abans que les sessions, perquè un rebuig no deixi el pla enrere. */
export function sortSyncOps<T extends Pick<SyncOp, 'entity' | 'createdAt'>>(ops: T[]): T[] {
  const rank = (entity: SyncEntity) => {
    const index = ORDER.indexOf(entity);
    return index === -1 ? ORDER.length : index;
  };
  return [...ops].sort((a, b) => rank(a.entity) - rank(b.entity) || a.createdAt.localeCompare(b.createdAt));
}
