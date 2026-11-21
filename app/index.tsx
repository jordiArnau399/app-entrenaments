import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clientReport } from '../src/domain/report';
import { greeting, todayIso } from '../src/domain/dates';
import { useApp } from '../src/state/store';
import { Boot } from '../src/ui/shell';
import { colors, font } from '../src/ui/theme';
import { Button, Card, Mark, Pill, T } from '../src/ui/ui';

export default function EntryScreen() {
  const insets = useSafeAreaInsets();
  const { ready, error, snapshot, enterTrainer, enterClient, resetDemo } = useApp();
  if (error) return <Boot message={error} />;
  if (!ready || !snapshot) return <Boot />;
  const today = todayIso();
  const trainer = snapshot.trainers[0];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28, paddingTop: insets.top + 36, paddingBottom: insets.bottom + 36 }}>
      <View style={{ width: '100%', maxWidth: 1080, alignSelf: 'center', gap: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        <View style={{ flexGrow: 1, flexBasis: 360, minWidth: 280, gap: 14 }}>
          <Mark size={52} />
          <T variant="display">Ritme</T>
          <T color={colors.muted} style={{ fontSize: 18, lineHeight: 26 }}>
            Plans, sessions i resultats. L'entrenador prepara el pla; el client l'anota, també sense cobertura.
          </T>
          <T variant="small">Mode demostració, sense compte. Les dades es guarden en aquest aparell.</T>
        </View>
        <View style={{ flexGrow: 1, flexBasis: 380, minWidth: 280, gap: 12 }}>
          <T variant="label">{greeting()}</T>
          <Card>
            <View style={{ gap: 8 }}>
              <Pill label="Entrenador" tone="accent" />
              <T variant="section">{trainer.name}</T>
              <T color={colors.muted}>Biblioteca, plantilles i seguiment de cada client.</T>
              <Button
                label="Entra com a entrenador"
                onPress={() => {
                  enterTrainer().then(() => router.replace('/entrenador'));
                }}
              />
            </View>
          </Card>
          <T variant="label">Clients</T>
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
                    <TextHint>
                      {report.compliance.due === 0
                        ? 'Encara sense sessions vençudes'
                        : `${report.compliance.percent}% de compliment`}
                    </TextHint>
                  </View>
                </Card>
              </Pressable>
            );
          })}
          <Button label="Reinicia la demostració" tone="ghost" onPress={() => resetDemo()} />
        </View>
      </View>
    </ScrollView>
  );
}

function TextHint({ children }: { children: string }) {
  return <T variant="small" style={{ fontFamily: font.body }}>{children}</T>;
}
