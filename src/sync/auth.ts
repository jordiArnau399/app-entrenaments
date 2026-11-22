import { deviceTimeZone } from '../domain/dates';
import { deviceLanguage } from '../domain/i18n';

const KEY = 'ritme.auth';

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  email: string;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id: string; email?: string };
  error_description?: string;
  msg?: string;
  message?: string;
  error?: string;
};

const memory = new Map<string, string>();

export function supabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ''), anonKey };
}

export function supabaseConfigured(): boolean {
  return supabaseConfig() !== null;
}

function readRaw(): string | null {
  if (typeof localStorage !== 'undefined') return localStorage.getItem(KEY);
  return memory.get(KEY) ?? null;
}

function writeRaw(value: string | null): void {
  if (typeof localStorage !== 'undefined') {
    if (value == null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, value);
  }
  if (value == null) memory.delete(KEY);
  else memory.set(KEY, value);
}

export function loadAuthSession(): AuthSession | null {
  const raw = readRaw();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.accessToken || !parsed.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession | null): void {
  writeRaw(session ? JSON.stringify(session) : null);
}

function sessionFromToken(body: TokenResponse, fallbackEmail = ''): AuthSession {
  if (!body.access_token || !body.refresh_token || !body.user?.id) {
    throw new Error(authError(body) || 'No s\'ha pogut obrir la sessió');
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
    userId: body.user.id,
    email: body.user.email ?? fallbackEmail,
  };
}

function authError(body: TokenResponse): string {
  return body.error_description || body.msg || body.message || body.error || '';
}

async function authFetch(path: string, body: unknown): Promise<AuthSession> {
  const config = supabaseConfig();
  if (!config) throw new Error('Supabase no està configurat');
  const response = await fetch(`${config.url}${path}`, {
    method: 'POST',
    headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as TokenResponse;
  if (!response.ok || !payload.access_token) {
    const message = authError(payload);
    if (/confirm/i.test(message) || (!payload.access_token && response.ok)) {
      throw new Error('Confirma el correu abans d\'entrar. A Supabase, desactiva Confirm email si vols entrar de seguida.');
    }
    throw new Error(message || 'El correu o la contrasenya no són correctes');
  }
  const session = sessionFromToken(payload);
  saveAuthSession(session);
  return session;
}

export function signIn(email: string, password: string): Promise<AuthSession> {
  return authFetch('/auth/v1/token?grant_type=password', { email: email.trim(), password });
}

export function signUpTrainer(name: string, email: string, password: string, inviteCode = ''): Promise<AuthSession> {
  return authFetch('/auth/v1/signup', {
    email: email.trim(),
    password,
    data: {
      name: name.trim(),
      role: 'trainer',
      invite_code: inviteCode.trim().toUpperCase(),
      timezone: deviceTimeZone(),
      language: deviceLanguage(),
    },
  });
}

export function signUpClient(name: string, email: string, password: string, inviteCode: string): Promise<AuthSession> {
  return authFetch('/auth/v1/signup', {
    email: email.trim(),
    password,
    data: {
      name: name.trim(),
      role: 'client',
      invite_code: inviteCode.trim().toUpperCase(),
      timezone: deviceTimeZone(),
      language: deviceLanguage(),
    },
  });
}

export async function refreshAuth(current: AuthSession): Promise<AuthSession> {
  const config = supabaseConfig();
  if (!config) return current;
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: current.refreshToken }),
  });
  const payload = (await response.json()) as TokenResponse;
  if (!response.ok) {
    saveAuthSession(null);
    throw new Error(authError(payload) || 'La sessió ha caducat. Torna a entrar.');
  }
  const session = sessionFromToken(payload, current.email);
  saveAuthSession(session);
  return session;
}

export async function freshAuth(): Promise<AuthSession | null> {
  const current = loadAuthSession();
  if (!current) return null;
  if (current.expiresAt > Date.now() + 60_000) return current;
  try {
    return await refreshAuth(current);
  } catch {
    return null;
  }
}

export function signOutLocal(): void {
  saveAuthSession(null);
}
