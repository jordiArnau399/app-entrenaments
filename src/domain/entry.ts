export const CLIENT_SITE = 'https://jordiarnau399.github.io/app-entrenaments/';
export const TRAINER_SITE = 'https://jordiarnau399.github.io/app-entrenaments/entrenador';

export type Door = 'client' | 'trainer';
export type AccountRole = Door | 'admin';

/** La porta que ha obert i el rol del compte. L'administrador entra amb els entrenadors. */
export function doorFor(page: Door, role: AccountRole | null): 'enter' | 'login' | 'wrong' {
  if (role == null) return 'login';
  if (role === 'admin') return page === 'trainer' ? 'enter' : 'wrong';
  return page === role ? 'enter' : 'wrong';
}
