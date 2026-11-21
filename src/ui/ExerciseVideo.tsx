import { createElement, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { classifyVideo, embedSource } from '../domain/video';
import { signedVideoUrl } from '../sync/videoStorage';
import { colors } from './theme';
import { Button, T } from './ui';

export function ExerciseVideoButton({ videoUrl }: { videoUrl: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  if (!classifyVideo(videoUrl)) return null;
  return (
    <View style={{ gap: 8 }}>
      <Button label={open ? 'Amaga el vídeo' : 'Com es fa'} tone="secondary" onPress={() => setOpen((value) => !value)} />
      {open && videoUrl ? <VideoFrame videoUrl={videoUrl} /> : null}
    </View>
  );
}

function VideoFrame({ videoUrl }: { videoUrl: string }) {
  const [src, setSrc] = useState<string | null>(classifyVideo(videoUrl) === 'storage' ? null : embedSource(videoUrl)?.src ?? null);
  const [kind, setKind] = useState<'iframe' | 'video' | null>(embedSource(videoUrl)?.kind ?? null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (classifyVideo(videoUrl) !== 'storage') return;
    let alive = true;
    signedVideoUrl(videoUrl)
      .then((url) => {
        if (!alive) return;
        setSrc(url);
        setKind('video');
      })
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : 'No s’ha pogut obrir el vídeo');
      });
    return () => {
      alive = false;
    };
  }, [videoUrl]);
  if (error) return <T color={colors.bad}>{error}</T>;
  if (!src || !kind) return <T color={colors.muted}>S’està obrint el vídeo…</T>;
  if (Platform.OS === 'web') {
    const style = { width: '100%', height: 240, border: 0, borderRadius: 12, backgroundColor: '#111' };
    return kind === 'iframe'
      ? createElement('iframe', { src, style, allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture', allowFullScreen: true, title: 'Com es fa' })
      : createElement('video', { src, style, controls: true, playsInline: true });
  }
  const WebView = require('react-native-webview').WebView as typeof import('react-native-webview').WebView;
  const safe = src.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const inner = kind === 'iframe'
    ? `<iframe src="${safe}" style="width:100%;height:100%;border:0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
    : `<video src="${safe}" controls playsinline style="width:100%;height:100%;background:#111"></video>`;
  return (
    <View style={{ height: 240, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111' }}>
      <WebView originWhitelist={['*']} source={{ html: `<!doctype html><html><body style="margin:0;background:#111">${inner}</body></html>` }} />
    </View>
  );
}
