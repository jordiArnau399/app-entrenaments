export type VideoKind = 'youtube' | 'vimeo' | 'file' | 'storage';

export function classifyVideo(url: string | null | undefined): VideoKind | null {
  const value = url?.trim() ?? '';
  if (!value) return null;
  if (value.startsWith('storage:exercise-videos/')) return 'storage';
  if (/youtu\.be|youtube\.com/i.test(value)) return 'youtube';
  if (/vimeo\.com/i.test(value)) return 'vimeo';
  if (/^https?:\/\//i.test(value)) return 'file';
  return null;
}

export function youtubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/);
  return match?.[1] ?? null;
}

export function vimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1] ?? null;
}

export function embedSource(url: string): { kind: 'iframe' | 'video'; src: string } | null {
  const kind = classifyVideo(url);
  if (kind === 'youtube') {
    const id = youtubeId(url);
    return id ? { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0` } : null;
  }
  if (kind === 'vimeo') {
    const id = vimeoId(url);
    return id ? { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` } : null;
  }
  if (kind === 'file') return { kind: 'video', src: url.trim() };
  return null;
}

export function storageObjectPath(trainerId: string, exerciseId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 80) || 'video.mp4';
  return `${trainerId}/${exerciseId}/${safe}`;
}

export function storageVideoUrl(path: string): string {
  return `storage:exercise-videos/${path}`;
}

export function parseStorageUrl(url: string): string | null {
  const prefix = 'storage:exercise-videos/';
  if (!url.startsWith(prefix)) return null;
  const path = url.slice(prefix.length);
  return path.length > 0 ? path : null;
}
