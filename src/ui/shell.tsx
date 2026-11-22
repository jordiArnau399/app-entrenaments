import { ReactNode, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { currentUserName } from '../domain/actor';
import { useApp } from '../state/store';
import { useT } from './language';
import { colors, font } from './theme';
import { Mark, Notice, T } from './ui';

export function useWide(): boolean {
  return useWindowDimensions().width >= 980;
}

export function syncCopy(offline: boolean, pending: number, hub: 'off' | 'connected' | 'unavailable'): { label: string; color: string } {
  if (offline) {
    return { label: pending > 0 ? `Sense connexió · ${pending} pendents` : 'Sense connexió', color: colors.warn };
  }
  if (pending > 0) return { label: `${pending} pendents de sincronitzar`, color: colors.warn };
  if (hub === 'connected') return { label: 'Sincronitzat', color: colors.good };
  if (hub === 'unavailable') return { label: 'Concentrador no disponible', color: colors.warn };
  return { label: 'Només en aquest aparell', color: colors.muted };
}

export function Boot({ message }: { message?: string | null }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
      <Mark size={48} />
      <T variant="title">Ritme</T>
      <T color={colors.muted} style={{ textAlign: 'center' }}>
        {message ?? 'S’està obrint…'}
      </T>
    </View>
  );
}

export function Screen({ children, narrow = false, onRefresh }: { children: ReactNode; narrow?: boolean; onRefresh?: () => Promise<unknown> | unknown }) {
  const wide = useWide();
  const { notice } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  return (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              Promise.resolve(onRefresh()).finally(() => setRefreshing(false));
            }}
          />
        ) : undefined
      }
      contentContainerStyle={{ padding: wide ? 32 : 16, paddingBottom: 56, gap: 18, width: '100%', maxWidth: narrow ? 760 : 1120, alignSelf: 'center' }}
    >
      <Notice message={notice} />
      {children}
    </ScrollView>
  );
}

type NavItem = { href: string; label: string; active: (path: string) => boolean };

export const trainerNav: NavItem[] = [
  { href: '/entrenador', label: 'Inici', active: (path) => path === '/entrenador' },
  { href: '/entrenador/clients', label: 'Clients', active: (path) => path.startsWith('/entrenador/clients') },
  { href: '/entrenador/exercicis', label: 'Exercicis', active: (path) => path.startsWith('/entrenador/exercicis') },
  { href: '/entrenador/plantilles', label: 'Plantilles', active: (path) => path.startsWith('/entrenador/plantilles') },
];

export const clientNav: NavItem[] = [
  { href: '/client', label: 'Avui', active: (path) => path === '/client' },
  { href: '/client/calendari', label: 'Calendari', active: (path) => path.startsWith('/client/calendari') },
  { href: '/client/resultats', label: 'Resultats', active: (path) => path.startsWith('/client/resultats') },
  { href: '/client/ajustos', label: 'Ajustos', active: (path) => path.startsWith('/client/ajustos') },
];

export function SyncLabel({ light = false }: { light?: boolean }) {
  const { snapshot, pending, hub, syncProblems, retrySync, syncing } = useApp();
  const [open, setOpen] = useState(false);
  const sync = syncCopy(Boolean(snapshot?.settings.offline), pending, hub);
  const color = light ? (pending > 0 ? '#F6C7C2' : '#B7AFA3') : sync.color;
  return (
    <View style={{ gap: 8 }}>
      <Pressable accessibilityRole="button" disabled={pending === 0} onPress={() => setOpen((value) => !value)}>
        <Text style={{ color, fontFamily: font.body, fontSize: 13 }}>{sync.label}</Text>
      </Pressable>
      {open && pending > 0 ? (
        <View style={{ gap: 8 }}>
          {syncProblems.length === 0 ? (
            <Text style={{ color, fontFamily: font.body, fontSize: 12 }}>Encara no hi ha el detall. Es torna a provar sol.</Text>
          ) : (
            syncProblems.map((problem) => (
              <View key={problem.id} style={{ gap: 2 }}>
                <Text style={{ color: light ? '#F6F1E8' : colors.ink, fontFamily: font.body, fontSize: 12, fontWeight: '600' }}>{problem.title}</Text>
                <Text style={{ color, fontFamily: font.body, fontSize: 12 }}>{problem.detail}</Text>
              </View>
            ))
          )}
          <Pressable accessibilityRole="button" disabled={syncing} onPress={() => { retrySync().catch(() => undefined); }}>
            <Text style={{ color: light ? '#F6F1E8' : colors.accent, fontFamily: font.body, fontSize: 13, fontWeight: '600' }}>Torna a provar</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function TrainerSidebar() {
  const path = usePathname();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { snapshot, leave, resetDemo, signOutAccount } = useApp();
  return (
    <View style={{ width: 252, backgroundColor: colors.sidebar, paddingTop: insets.top + 22, paddingBottom: insets.bottom + 18, paddingHorizontal: 16, justifyContent: 'space-between' }}>
      <View style={{ gap: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 }}>
          <Mark light size={36} />
          <View>
            <Text style={{ color: colors.sidebarText, fontFamily: font.display, fontSize: 28, lineHeight: 32 }}>Ritme</Text>
            <Text style={{ color: colors.sidebarMuted, fontFamily: font.body, fontSize: 13 }}>Entrenador</Text>
          </View>
        </View>
        <View style={{ gap: 4 }}>
          {(snapshot?.settings.role === 'admin'
            ? [...trainerNav, { href: '/entrenador/admin', label: 'Administració', active: (path: string) => path.startsWith('/entrenador/admin') }]
            : trainerNav
          ).map((item) => {
            const active = item.active(path);
            return (
              <Pressable
                key={item.href}
                accessibilityRole="button"
                onPress={() => router.push(item.href as never)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12, backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent' }}
              >
                <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: active ? colors.accent : 'transparent' }} />
                <Text style={{ color: active ? colors.sidebarText : colors.sidebarMuted, fontFamily: font.body, fontSize: 16, fontWeight: '600' }}>{t(item.label)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ gap: 8, paddingHorizontal: 8 }}>
        <Text style={{ color: colors.sidebarText, fontFamily: font.body, fontSize: 15, fontWeight: '600' }}>{snapshot ? currentUserName(snapshot) : ''}</Text>
        <SyncLabel light />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const leaveApp = snapshot?.settings.mode === 'account' ? signOutAccount : leave;
            leaveApp().then(() => router.replace('/'));
          }}
        >
          <Text style={{ color: colors.sidebarText, fontFamily: font.body, paddingVertical: 6 }}>
            {snapshot?.settings.mode === 'account' ? 'Tanca la sessió' : 'Canvia de perfil'}
          </Text>
        </Pressable>
        {snapshot?.settings.mode === 'account' ? null : (
          <Pressable accessibilityRole="button" onPress={() => { resetDemo().then(() => router.replace('/')); }}>
            <Text style={{ color: colors.sidebarMuted, fontFamily: font.body, paddingVertical: 6 }}>Reinicia la demostració</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function TopBar({ title, items }: { title: string; items?: NavItem[] }) {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const wide = useWide();
  const t = useT();
  return (
    <View style={{ paddingTop: insets.top + 10, paddingHorizontal: wide ? 28 : 16, paddingBottom: 10, backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Mark size={28} />
        <Text style={{ fontFamily: font.display, fontSize: 24, color: colors.ink }}>{title}</Text>
      </View>
      {wide && items ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {items.map((item) => {
            const active = item.active(path);
            return (
              <Pressable key={item.href} onPress={() => router.push(item.href as never)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: active ? colors.ink : 'transparent' }}>
                <Text style={{ fontFamily: font.body, fontWeight: '600', color: active ? colors.surface : colors.ink }}>{t(item.label)}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <SyncLabel />
      )}
    </View>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 6 }}>
      {items.map((item) => {
        const active = item.active(path);
        return (
          <Pressable key={item.href} accessibilityRole="button" onPress={() => router.push(item.href as never)} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, gap: 4 }}>
            <View style={{ width: 18, height: 3, borderRadius: 2, backgroundColor: active ? colors.accent : 'transparent' }} />
            <Text style={{ fontFamily: font.body, fontSize: 13, fontWeight: '600', color: active ? colors.ink : colors.muted }}>{t(item.label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PageIntro({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {eyebrow ? <T variant="label">{eyebrow}</T> : null}
      <T variant="title">{title}</T>
      {detail ? <T color={colors.muted}>{detail}</T> : null}
    </View>
  );
}
