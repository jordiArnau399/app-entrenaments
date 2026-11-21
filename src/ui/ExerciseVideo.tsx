import { createElement, useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { classifyVideo, embedSource } from '../domain/video';
import { signedVideoUrl } from '../sync/videoStorage';
import { colors, font } from './theme';
import { T } from './ui';

/** La pastilla va al costat del títol. El vídeo, si s’obre, queda a sota d’aquest bloc. */
export function ExerciseVideo({
  videoUrl,
  children,
}: {
  videoUrl: string | null | undefined;
  children: (cue: ReactNode | null) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const playable = classifyVideo(videoUrl) != null;
  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 14 }}>{children(playable ? <VideoCue open={open} onPress={() => setOpen((value) => !value)} /> : null)}</View>
      {open && videoUrl ? <VideoFrame videoUrl={videoUrl} /> : null}
    </View>
  );
}

function VideoCue({ open, onPress }: { open: boolean; onPress: () => void }) {
  const label = open ? 'Amaga' : 'Com es fa';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={open ? 'Amaga el vídeo' : 'Com es fa'}
      onPress={onPress}
      style={({ pressed }) => ({
        flexGrow: 0,
        flexShrink: 0,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: colors.accentSoft,
        borderWidth: 1,
        borderColor: colors.accent,
        opacity: pressed ? 0.88 : 1,
      })}
    >
      {open ? null : <PlayIcon />}
      <Text style={{ fontFamily: font.body, fontSize: 13, fontWeight: '600', color: colors.accent }}>{label}</Text>
    </Pressable>
  );
}

function PlayIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 18 18">
      <Circle cx="9" cy="9" r="7.2" fill="none" stroke={colors.accent} strokeWidth={1.6} />
      <Path d="M7.5 5.6 L12.4 9 L7.5 12.4 Z" fill={colors.accent} />
    </Svg>
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
