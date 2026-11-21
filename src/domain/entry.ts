export const CLIENT_SITE = 'https://jordiarnau399.github.io/app-entrenaments/';
export const TRAINER_SITE = 'https://jordiarnau399.github.io/app-entrenaments/entrenador';

export type Door = 'client' | 'trainer';

/** La porta que ha obert i el rol del compte. `enter` entra a l'app; `wrong` avisa de l'altra adreça. */
export function doorFor(page: Door, role: Door | null): 'enter' | 'login' | 'wrong' {
  if (role == null) return 'login';
  return page === role ? 'enter' : 'wrong';
}
