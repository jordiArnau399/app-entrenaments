export const ADMIN_EMAIL = 'jordiarnau@gmail.com';

export type InviteKind = 'client' | 'trainer';

/** Mateixa regla que handle_new_user. Sense codi no neix cap entrenador, tret del correu administrador. */
export function signupOutcome(input: {
  email: string;
  inviteKind: InviteKind | null;
}): 'admin' | 'trainer' | 'client' | 'rejected' {
  if (input.email.trim().toLowerCase() === ADMIN_EMAIL) return 'admin';
  if (input.inviteKind === 'trainer') return 'trainer';
  if (input.inviteKind === 'client') return 'client';
  return 'rejected';
}
