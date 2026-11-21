import { blankSnapshot } from '../domain/account';
import { createId } from '../domain/ids';
import { freshAuth, supabaseConfigured } from '../sync/auth';
import { pullCloud } from '../sync/cloud';
import { connectRemote } from '../sync/remote';
import { Repository } from './repository';
import { openBrowserStorage, openSqliteStorage } from './sqlite';
import type { Storage } from './storage';

export async function openAppRepository(): Promise<Repository> {
  const storage = await openBestStorage();
  if (supabaseConfigured()) {
    const existing = await storage.loadSnapshot();
    if (!existing) {
      const blank = blankSnapshot(createId('dev'));
      blank.settings.mode = undefined;
      await storage.saveSnapshot(blank);
      await storage.saveQueue([]);
    }
  }
  const remote = await connectRemote();
  const repo = await Repository.load(storage, remote);
  if (supabaseConfigured()) {
    const session = await freshAuth();
    if (session) {
      try {
        await repo.adoptAccount(await pullCloud(), session.userId);
      } catch (error) {
        console.warn('No s\'han pogut baixar les dades del núvol.', error);
      }
    }
  }
  return repo;
}

async function openBestStorage(): Promise<Storage> {
  try {
    return await withTimeout(openSqliteReady(), 12000);
  } catch (error) {
    console.warn('SQLite no disponible, es fa servir la memòria del navegador.', error);
    return openBrowserStorage();
  }
}

async function openSqliteReady() {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const storage = await openSqliteStorage();
      await storage.loadSnapshot();
      return storage;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Temps esgotat obrint la base de dades')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
