import { Slot, router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useApp } from '../../src/state/store';
import { Boot, BottomNav, TopBar, clientNav, useWide } from '../../src/ui/shell';
import { colors } from '../../src/ui/theme';

export default function ClientLayout() {
  const { ready, error, snapshot } = useApp();
  const wide = useWide();
  const path = usePathname();
  const focus = path.includes('/sessio/');
  useEffect(() => {
    if (ready && snapshot && (snapshot.settings.role !== 'client' || !snapshot.settings.clientId)) router.replace('/');
  }, [ready, snapshot]);
  if (error) return <Boot message={error} />;
  if (!ready || !snapshot || snapshot.settings.role !== 'client') return <Boot />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      {focus ? null : <TopBar title="Ritme" items={wide ? clientNav : undefined} />}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      {focus || wide ? null : <BottomNav items={clientNav} />}
    </View>
  );
}
