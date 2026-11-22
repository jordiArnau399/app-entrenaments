import { describe, expect, it } from 'vitest';
import { classifyVideo, embedSource, parseStorageUrl, storageObjectPath, storageVideoUrl } from './video';

describe('vídeo d’un exercici', () => {
  it('distingeix enllaços i fitxers, i no inventa res si és buit', () => {
    expect(classifyVideo(null)).toBeNull();
    expect(classifyVideo('  ')).toBeNull();
    expect(classifyVideo('https://www.youtube.com/watch?v=abcdefghijk')).toBe('youtube');
    expect(classifyVideo('https://youtu.be/abcdefghijk')).toBe('youtube');
    expect(classifyVideo('https://vimeo.com/123456789')).toBe('vimeo');
    expect(classifyVideo('https://cdn.exemple.cat/esquat.mp4')).toBe('file');
    expect(classifyVideo('storage:exercise-videos/trainer/ex/clip.mp4')).toBe('storage');
    expect(embedSource('https://youtu.be/abcdefghijk')?.src).toBe('https://www.youtube-nocookie.com/embed/abcdefghijk?playsinline=1&rel=0');
    expect(embedSource('https://vimeo.com/video/99')?.src).toBe('https://player.vimeo.com/video/99');
    expect(embedSource('https://cdn.exemple.cat/esquat.mp4')).toEqual({ kind: 'video', src: 'https://cdn.exemple.cat/esquat.mp4' });
    expect(embedSource('')).toBeNull();
  });

  it('desa el fitxer pujat dins la carpeta de l’entrenador', () => {
    const path = storageObjectPath('trainer-1', 'ex_esquat', 'El meu vídeo!.mp4');
    expect(path.startsWith('trainer-1/ex_esquat/')).toBe(true);
    expect(path.includes(' ')).toBe(false);
    expect(parseStorageUrl(storageVideoUrl(path))).toBe(path);
    expect(parseStorageUrl('https://youtu.be/abcdefghijk')).toBeNull();
  });
});
