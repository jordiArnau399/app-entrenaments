export type Lang = 'ca' | 'es' | 'en';

const es: Record<string, string> = {
  Avui: 'Hoy',
  Calendari: 'Calendario',
  Resultats: 'Resultados',
  Ajustos: 'Ajustes',
  Clients: 'Clientes',
  Exercicis: 'Ejercicios',
  Plantilles: 'Plantillas',
  Inici: 'Inicio',
  Entrenador: 'Entrenador',
  Administració: 'Administración',
  'Com es fa': 'Cómo se hace',
  'Amaga el vídeo': 'Ocultar el vídeo',
  'Següent exercici': 'Siguiente ejercicio',
  'Comença la sessió': 'Empieza la sesión',
  'Registrar-la igualment': 'Registrarla igualmente',
  'Canvia la plantilla': 'Cambia la plantilla',
  'Substitueix el pla': 'Sustituye el plan',
  'Plantilles anteriors': 'Plantillas anteriores',
  'Crea el compte': 'Crea la cuenta',
  'Tinc un codi d’invitació': 'Tengo un código de invitación',
  'Codi d’invitació': 'Código de invitación',
  'Ja tinc compte': 'Ya tengo cuenta',
  Entra: 'Entra',
  'Tanca la sessió': 'Cierra la sesión',
  Llengua: 'Idioma',
  Català: 'Catalán',
  Español: 'Español',
  English: 'Inglés',
  'Convida un entrenador': 'Invita a un entrenador',
  Desactiva: 'Desactiva',
  Activa: 'Activa',
  'Mou el client': 'Mueve al cliente',
  'Sense connexió': 'Sin conexión',
  Sincronitzat: 'Sincronizado',
};

const en: Record<string, string> = {
  Avui: 'Today',
  Calendari: 'Calendar',
  Resultats: 'Results',
  Ajustos: 'Settings',
  Clients: 'Clients',
  Exercicis: 'Exercises',
  Plantilles: 'Templates',
  Inici: 'Home',
  Entrenador: 'Trainer',
  Administració: 'Admin',
  'Com es fa': 'How to do it',
  'Amaga el vídeo': 'Hide the video',
  'Següent exercici': 'Next exercise',
  'Comença la sessió': 'Start the session',
  'Registrar-la igualment': 'Log it anyway',
  'Canvia la plantilla': 'Change the template',
  'Substitueix el pla': 'Replace the plan',
  'Plantilles anteriors': 'Previous templates',
  'Crea el compte': 'Create the account',
  'Tinc un codi d’invitació': 'I have an invite code',
  'Codi d’invitació': 'Invite code',
  'Ja tinc compte': 'I already have an account',
  Entra: 'Log in',
  'Tanca la sessió': 'Log out',
  Llengua: 'Language',
  Català: 'Catalan',
  Español: 'Spanish',
  English: 'English',
  'Convida un entrenador': 'Invite a trainer',
  Desactiva: 'Deactivate',
  Activa: 'Activate',
  'Mou el client': 'Move the client',
  'Sense connexió': 'Offline',
  Sincronitzat: 'Synced',
};

export function deviceLanguage(): Lang {
  const value = (typeof navigator !== 'undefined' ? navigator.language : 'ca').toLowerCase();
  if (value.startsWith('es')) return 'es';
  if (value.startsWith('en')) return 'en';
  return 'ca';
}

export function resolveLanguage(chosen: string | null | undefined, device = deviceLanguage()): Lang {
  if (chosen === 'es' || chosen === 'en' || chosen === 'ca') return chosen;
  return device;
}

/** La clau és el text en català. Si falta la traducció, es queda en català. */
export function translate(lang: Lang, source: string): string {
  if (lang === 'es') return es[source] ?? source;
  if (lang === 'en') return en[source] ?? source;
  return source;
}
