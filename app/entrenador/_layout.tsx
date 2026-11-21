import { Slot, router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useApp } from '../../src/state/store';
import { Boot, BottomNav, TopBar, TrainerSidebar, trainerNav, useWide } from '../../src/ui/shell';
import { colors } from '../../src/ui/theme';

export default function TrainerLayout() {
  const { ready, error, snapshot } = useApp();
  const wide = useWide();
  useEffect(() => {
    if (ready && snapshot && snapshot.settings.role !== 'trainer') router.replace('/');
  }, [ready, snapshot]);
  if (error) return <Boot message={error} />;
  if (!ready || !snapshot || snapshot.settings.role !== 'trainer') return <Boot />;
  return (
    <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column', backgroundColor: colors.paper }}>
      {wide ? <TrainerSidebar /> : <TopBar title="Ritme" />}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      {wide ? null : <BottomNav items={trainerNav} />}
    </View>
  );
}
