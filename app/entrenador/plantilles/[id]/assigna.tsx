import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { assignTemplate } from '../../../../src/domain/assignPlan';
import { capitalize, formatLongDate, isIsoDate, todayIso } from '../../../../src/domain/dates';
import { sequentialIds } from '../../../../src/domain/ids';
import { useApp, useSnapshot } from '../../../../src/state/store';
import { PageIntro, Screen } from '../../../../src/ui/shell';
import { colors } from '../../../../src/ui/theme';
import { Button, Card, Field, Pill, Stepper, T } from '../../../../src/ui/ui';

export default function AssignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const snapshot = useSnapshot();
  const { assign } = useApp();
  const template = snapshot.templates.find((item) => item.id === id);
  const [clientId, setClientId] = useState(snapshot.clients[0]?.id ?? '');
  const [startDate, setStartDate] = useState(todayIso());
  const [weeks, setWeeks] = useState(6);
  if (!template) {
    return (
      <Screen>
        <T>No s'ha trobat la plantilla.</T>
      </Screen>
    );
  }
  let preview = '';
  if (isIsoDate(startDate)) {
    try {
      const result = assignTemplate({
        template,
        clientId: clientId || 'preview',
        trainerId: template.trainerId,
        startDate,
        weeks,
        nowIso: new Date().toISOString(),
        ids: sequentialIds('preview'),
      });
      preview = `${result.sessions.length} sessions, del ${formatLongDate(startDate)} al ${formatLongDate(result.plan.endDate)}. El pla és una còpia: la plantilla pot canviar després sense afectar aquest client.`;
    } catch (error) {
      preview = error instanceof Error ? error.message : 'Revisa la data i les setmanes.';
    }
  } else {
    preview = 'Escriu la data com a any-mes-dia, per exemple 2026-11-21.';
  }
  return (
    <Screen narrow>
      <PageIntro eyebrow="Assignació" title={template.name} detail="Tria el client, el dia que comença i quantes setmanes dura." />
      <Card style={{ gap: 12 }}>
        <T variant="label">Client</T>
        <View style={{ gap: 8 }}>
          {snapshot.clients.map((client) => (
            <Pressable key={client.id} onPress={() => setClientId(client.id)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T style={{ fontWeight: client.id === clientId ? '600' : '400' }}>{client.name}</T>
                {client.id === clientId ? <Pill label="Triat" tone="accent" /> : null}
              </View>
            </Pressable>
          ))}
        </View>
        <Field label="Data d'inici" value={startDate} onChangeText={setStartDate} placeholder="2026-11-21" />
        <Stepper label="Setmanes" value={weeks} min={1} max={52} onChange={(value) => setWeeks(Math.round(value))} />
        <T color={colors.muted}>{capitalize(preview)}</T>
        <Button
          label="Crea el pla"
          disabled={!clientId || !isIsoDate(startDate)}
          onPress={() => {
            assign({ templateId: template.id, clientId, startDate, weeks }).then((planId) => {
              if (planId) router.replace(`/entrenador/clients/${clientId}`);
            });
          }}
        />
      </Card>
    </Screen>
  );
}
