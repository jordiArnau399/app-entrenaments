import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { clientReport } from '../src/domain/report';
import { greeting, todayIso } from '../src/domain/dates';
import { doorFor } from '../src/domain/entry';
import { useApp } from '../src/state/store';
import { AccountForm, DoorFrame, WrongDoor } from '../src/ui/AccountDoor';
import { Boot } from '../src/ui/shell';
import { colors, font } from '../src/ui/theme';
import { Button, Card, Pill, T } from '../src/ui/ui';

export default function EntryScreen() {
  const app = useApp();
  const { ready, error, snapshot, enterClient, resetDemo, accounts } = app;
  const signedIn = Boolean(accounts && snapshot?.settings.mode === 'account');
  const accountRole = snapshot?.settings.role;
  const role = signedIn && (accountRole === 'client' || accountRole === 'trainer' || accountRole === 'admin') ? accountRole : null;
  const door = doorFor('client', role);
  useEffect(() => {
    if (ready && door === 'enter') router.replace('/client');
  }, [ready, door]);
  if (error) return <Boot message={error} />;
  if (!ready || !snapshot) return <Boot />;
  if (signedIn && door === 'wrong') return <WrongDoor page="client" />;
  if (signedIn && door === 'enter') return <Boot />;
  if (accounts && snapshot.settings.mode !== 'account') {
    return (
      <DoorFrame>
        <T color={colors.muted}>Entra amb el correu que t’ha dit l’entrenador, o crea el compte amb el codi d’invitació.</T>
        <AccountForm audience="client" />
      </DoorFrame>
    );
  }
  const today = todayIso();
  return (
    <DoorFrame>
      <T variant="label">{greeting()}</T>
      <T color={colors.muted}>Mode demostració. Tria un client. L’entrenador entra a la seva pàgina.</T>
      {snapshot.clients.map((client) => {
        const report = clientReport({
          clientId: client.id,
          today,
          plans: snapshot.plans,
          sessions: snapshot.sessions,
          logs: snapshot.logs,
          exercises: snapshot.exercises,
        });
        return (
          <Pressable
            key={client.id}
            accessibilityRole="button"
            onPress={() => {
              enterClient(client.id).then(() => router.replace('/client'));
            }}
          >
            <Card>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <T variant="section">{client.name}</T>
                  <Pill label={report.status === 'al_dia' ? 'Al dia' : 'Endarrerit'} tone={report.status === 'al_dia' ? 'good' : 'warn'} />
                </View>
                <T color={colors.muted}>{report.activePlan?.name ?? 'Sense pla actiu'}</T>
                <T variant="small" style={{ fontFamily: font.body }}>
                  {report.compliance.due === 0 ? 'Encara sense sessions vençudes' : `${report.compliance.percent}% de compliment`}
                </T>
              </View>
            </Card>
          </Pressable>
        );
      })}
      <Button label="Reinicia la demostració" tone="ghost" onPress={() => resetDemo()} />
    </DoorFrame>
  );
}
