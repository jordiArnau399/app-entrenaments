import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { RemoteStore } from '../data/repository';
import { isLocalDemoHost } from '../domain/host';
import type { DataCollections } from '../domain/types';

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function defaultHubUrl(): string | null {
  const configured = env('EXPO_PUBLIC_DEMO_HUB');
  if (configured === 'off' || configured === 'false') return null;
  if (configured) return configured.replace(/\/$/, '');
  if (env('EXPO_PUBLIC_SUPABASE_URL') && env('EXPO_PUBLIC_SUPABASE_ANON_KEY')) return null;
  // The published site keeps data in the browser. The hub is only the machine running `npm start`.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.replace(/^[a-z]+:\/\//i, '').split(':')[0];
    if (host && isLocalDemoHost(host)) return `http://${host}:8787`;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && isLocalDemoHost(window.location.hostname)) {
    return `http://${window.location.hostname}:8787`;
  }
  return null;
}

async function fetchJson(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function hubRemote(baseUrl: string): RemoteStore {
  return {
    name: 'hub',
    async pull() {
      const response = await fetchJson(`${baseUrl}/v1/snapshot`);
      if (!response.ok) throw new Error('El concentrador no respon');
      const data = (await response.json()) as DataCollections | null;
      if (!data || !Array.isArray(data.clients)) return null;
      return data;
    },
    async push(data) {
      const response = await fetchJson(`${baseUrl}/v1/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('No s’han pogut enviar les dades');
    },
  };
}

export function supabaseRemote(baseUrl: string, anonKey: string): RemoteStore {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  };
  return {
    name: 'supabase',
    async pull() {
      const response = await fetchJson(`${baseUrl}/rest/v1/ritme_state?id=eq.demo&select=payload`, { headers });
      if (!response.ok) throw new Error('Supabase ha rebutjat la lectura');
      const rows = (await response.json()) as { payload?: DataCollections }[];
      return rows[0]?.payload ?? null;
    },
    async push(data) {
      const response = await fetchJson(`${baseUrl}/rest/v1/ritme_state`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ id: 'demo', payload: data, updated_at: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error('Supabase ha rebutjat l’escriptura');
    },
  };
}

export async function connectRemote(): Promise<RemoteStore | null> {
  const supabaseUrl = env('EXPO_PUBLIC_SUPABASE_URL');
  const supabaseKey = env('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (supabaseUrl && supabaseKey) return supabaseRemote(supabaseUrl.replace(/\/$/, ''), supabaseKey);
  const hub = defaultHubUrl();
  if (!hub) return null;
  try {
    const response = await fetchJson(`${hub}/health`);
    if (!response.ok) return null;
    return hubRemote(hub);
  } catch {
    return null;
  }
}
