import { Slot, router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useApp } from '../../src/state/store';
import { unreadTotal } from '../../src/domain/chat';
import { Boot, BottomNav, TopBar, TrainerSidebar, trainerNav, useWide, withUnread } from '../../src/ui/shell';
import { colors } from '../../src/ui/theme';

export default function TrainerLayout() {
  const { ready, error, snapshot } = useApp();
  const wide = useWide();
  useEffect(() => {
    if (ready && snapshot && snapshot.settings.role !== 'trainer') router.replace('/');
  }, [ready, snapshot]);
  if (error) return <Boot message={error} />;
  if (!ready || !snapshot || snapshot.settings.role !== 'trainer') return <Boot />;
  const readerId = snapshot.settings.userId ?? snapshot.settings.trainerId ?? snapshot.trainers[0]?.id ?? '';
  const nav = withUnread(trainerNav, '/entrenador/xat', unreadTotal(snapshot.messages, readerId));
  return (
    <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column', backgroundColor: colors.paper }}>
      {wide ? <TrainerSidebar /> : <TopBar title="Ritme" />}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      {wide ? null : <BottomNav items={nav} />}
    </View>
  );
}
