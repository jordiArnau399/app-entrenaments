import { Repository } from './repository';
import { openBrowserStorage, openSqliteStorage } from './sqlite';
import { connectRemote } from '../sync/remote';

export async function openAppRepository(): Promise<Repository> {
  let storage;
  try {
    storage = await withTimeout(openSqliteReady(), 12000);
  } catch (error) {
    console.warn('SQLite no disponible, es fa servir la memòria del navegador.', error);
    storage = openBrowserStorage();
  }
  const remote = await connectRemote();
  return Repository.load(storage, remote);
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
