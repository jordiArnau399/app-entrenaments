import { Slot, router } from 'expo-router';
import { View } from 'react-native';
import { doorFor } from '../../src/domain/entry';
import { TRAINER_ID } from '../../src/domain/types';
import { useApp } from '../../src/state/store';
import { AccountForm, DoorFrame, WrongDoor } from '../../src/ui/AccountDoor';
import { Boot, BottomNav, TopBar, TrainerSidebar, trainerNav, useWide } from '../../src/ui/shell';
import { colors } from '../../src/ui/theme';
import { Button, Card, Pill, T } from '../../src/ui/ui';

export default function TrainerLayout() {
  const { ready, error, snapshot, accounts, enterTrainer } = useApp();
  const wide = useWide();
  const signedIn = Boolean(accounts && snapshot?.settings.mode === 'account');
  const accountRole = snapshot?.settings.role;
  const role = signedIn && (accountRole === 'client' || accountRole === 'trainer' || accountRole === 'admin')
    ? accountRole
    : accountRole === 'trainer'
      ? 'trainer'
      : null;
  const door = doorFor('trainer', role);
  if (error) return <Boot message={error} />;
  if (!ready || !snapshot) return <Boot />;
  if (door === 'wrong') return <WrongDoor page="trainer" />;
  const me = snapshot.trainers.find((trainer) => trainer.id === snapshot.settings.userId);
  if (signedIn && me?.status === 'inactive') {
    return (
      <DoorFrame>
        <T variant="title">Compte desactivat</T>
        <T color={colors.muted}>L’administrador ha aturat aquest compte d’entrenador. Quan el reactivi, torna a entrar.</T>
      </DoorFrame>
    );
  }
  if (door !== 'enter') {
    if (accounts && snapshot.settings.mode !== 'account') {
      return (
        <DoorFrame>
          <T color={colors.muted}>Pàgina de l’entrenador. Els clients entren a l’adreça principal.</T>
          <AccountForm audience="trainer" />
        </DoorFrame>
      );
    }
    const trainer = snapshot.trainers.find((item) => item.id === TRAINER_ID);
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
      {wide ? null : (
        <BottomNav
          items={
            snapshot.settings.role === 'admin'
              ? [...trainerNav, { href: '/entrenador/admin', label: 'Administració', active: (path) => path.startsWith('/entrenador/admin') }]
              : trainerNav
          }
        />
      )}
    </View>
  );
}
