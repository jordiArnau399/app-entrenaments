import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { formatShortDate, todayIso } from '../../../src/domain/dates';
import { clientReport } from '../../../src/domain/report';
import { useApp, useSnapshot } from '../../../src/state/store';
import { PageIntro, Screen } from '../../../src/ui/shell';
import { colors } from '../../../src/ui/theme';
import { Button, Card, Field, Pill, T } from '../../../src/ui/ui';

export default function ClientsScreen() {
  const snapshot = useSnapshot();
  const { addClient } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const today = todayIso();
  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <PageIntro eyebrow="Cartera" title="Clients" detail="Cada client està lligat a un sol entrenador." />
        <Button label={open ? 'Tanca' : 'Nou client'} tone="secondary" onPress={() => setOpen((value) => !value)} />
      </View>
      {open ? (
        <Card style={{ gap: 12 }}>
          <Field label="Nom" value={name} onChangeText={setName} placeholder="Nom i cognoms" />
          <Field label="Correu" value={email} onChangeText={setEmail} placeholder="nom@exemple.cat" keyboard="email-address" />
          <Button
            label="Afegeix el client"
            disabled={!name.trim()}
            onPress={() => {
              addClient(name, email).then(() => {
                setName('');
                setEmail('');
                setOpen(false);
              });
            }}
          />
          <T variant="small">En la demostració entra sense contrasenya, des de la pantalla inicial.</T>
        </Card>
      ) : null}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', padding: 14, backgroundColor: colors.paperDeep }}>
          <T variant="label" style={{ flex: 1.3 }}>Client</T>
          <T variant="label" style={{ flex: 1.2 }}>Pla</T>
          <T variant="label" style={{ flex: 0.7 }}>Compliment</T>
          <T variant="label" style={{ flex: 0.7 }}>Última</T>
        </View>
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
            <Pressable key={client.id} accessibilityRole="button" onPress={() => router.push(`/entrenador/clients/${client.id}`)} style={{ flexDirection: 'row', padding: 14, borderTopWidth: 1, borderTopColor: colors.line, alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1.3, gap: 4 }}>
                <T style={{ fontWeight: '600' }}>{client.name}</T>
                <Pill label={report.status === 'al_dia' ? 'Al dia' : 'Endarrerit'} tone={report.status === 'al_dia' ? 'good' : 'warn'} />
              </View>
              <T style={{ flex: 1.2 }} color={colors.muted}>{report.activePlan?.name ?? '—'}</T>
              <T style={{ flex: 0.7 }}>{report.compliance.due === 0 ? '—' : `${report.compliance.percent}%`}</T>
              <T style={{ flex: 0.7 }} color={colors.muted}>{report.lastSessionDate ? formatShortDate(report.lastSessionDate) : '—'}</T>
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}
