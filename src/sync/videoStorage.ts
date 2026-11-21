import { parseStorageUrl } from '../domain/video';
import { freshAuth, supabaseConfig } from './auth';

async function authHeaders(): Promise<{ url: string; headers: Record<string, string> }> {
  const config = supabaseConfig();
  const session = await freshAuth();
  if (!config || !session) throw new Error('Cal un compte per pujar el vídeo');
  return {
    url: config.url,
    headers: { apikey: config.anonKey, Authorization: `Bearer ${session.accessToken}` },
  };
}

export async function uploadExerciseVideo(path: string, file: Blob, contentType: string): Promise<void> {
  const { url, headers } = await authHeaders();
  const response = await fetch(`${url}/storage/v1/object/exercise-videos/${path}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': contentType || 'video/mp4', 'x-upsert': 'true' },
    body: file,
  });
  if (!response.ok) {
    throw new Error('No s’ha pogut pujar el vídeo. Comprova que has executat la migració de Storage.');
  }
}

export async function signedVideoUrl(videoUrl: string): Promise<string | null> {
  const path = parseStorageUrl(videoUrl);
  if (!path) return null;
  const { url, headers } = await authHeaders();
  const response = await fetch(`${url}/storage/v1/object/sign/exercise-videos/${path}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 60 * 60 }),
  });
  if (!response.ok) throw new Error('No s’ha pogut obrir el vídeo');
  const body = (await response.json()) as { signedURL?: string };
  if (!body.signedURL) return null;
  return body.signedURL.startsWith('http') ? body.signedURL : `${url}/storage/v1${body.signedURL}`;
}
