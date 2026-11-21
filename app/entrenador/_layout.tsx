import { Slot, router } from 'expo-router';
import { View } from 'react-native';
import { doorFor } from '../../src/domain/entry';
import { useApp } from '../../src/state/store';
import { AccountForm, DoorFrame, WrongDoor } from '../../src/ui/AccountDoor';
import { Boot, BottomNav, TopBar, TrainerSidebar, trainerNav, useWide } from '../../src/ui/shell';
import { colors } from '../../src/ui/theme';
import { Button, Card, Pill, T } from '../../src/ui/ui';

export default function TrainerLayout() {
  const { ready, error, snapshot, accounts, enterTrainer } = useApp();
  const wide = useWide();
  const signedIn = Boolean(accounts && snapshot?.settings.mode === 'account');
  const role = signedIn && (snapshot?.settings.role === 'client' || snapshot?.settings.role === 'trainer')
    ? snapshot.settings.role
    : snapshot?.settings.role === 'trainer'
      ? 'trainer'
      : null;
  const door = doorFor('trainer', role);
  if (error) return <Boot message={error} />;
  if (!ready || !snapshot) return <Boot />;
  if (door === 'wrong') return <WrongDoor page="trainer" />;
  if (door !== 'enter') {
    if (accounts && snapshot.settings.mode !== 'account') {
      return (
        <DoorFrame>
          <T color={colors.muted}>Pàgina de l’entrenador. Els clients entren a l’adreça principal.</T>
          <AccountForm audience="trainer" />
        </DoorFrame>
      );
    }
    const trainer = snapshot.trainers[0];
    return (
      <DoorFrame>
        <Card>
          <View style={{ gap: 8 }}>
            <Pill label="Entrenador" tone="accent" />
            <T variant="section">{trainer?.name ?? 'Entrenador'}</T>
            <T color={colors.muted}>Biblioteca, plantilles i seguiment de cada client. Mode demostració.</T>
            <Button label="Entra com a entrenador" onPress={() => { enterTrainer().then(() => router.replace('/entrenador')); }} />
          </View>
        </Card>
      </DoorFrame>
    );
  }
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
