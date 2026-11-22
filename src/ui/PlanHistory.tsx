import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { formatLongDate, isIsoDate, todayIso } from '../domain/dates';
import { useApp, useSnapshot } from '../state/store';
import { colors } from './theme';
import { Button, Card, Field, Pill, Stepper, T } from './ui';

export function PlanHistory({ clientId, timeZone }: { clientId: string; timeZone?: string | null }) {
  const snapshot = useSnapshot();
  const { assign } = useApp();
  const plans = snapshot.plans.filter((plan) => plan.clientId === clientId).slice().sort((a, b) => b.startDate.localeCompare(a.startDate));
  const active = plans.find((plan) => plan.status === 'active') ?? null;
  const history = plans.filter((plan) => plan.id !== active?.id);
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState(snapshot.templates[0]?.id ?? '');
  const [startDate, setStartDate] = useState(todayIso(new Date(), timeZone));
  const [weeks, setWeeks] = useState(6);
  return (
    <View style={{ gap: 12 }}>
      <Card style={{ gap: 10 }}>
        <T variant="section">{active ? active.name : 'Sense pla actiu'}</T>
        {active ? <T color={colors.muted}>Del {formatLongDate(active.startDate)} al {formatLongDate(active.endDate)}.</T> : null}
        <Button label={open ? 'Tanca' : active ? 'Canvia la plantilla' : 'Assigna una plantilla'} tone="secondary" onPress={() => setOpen((value) => !value)} />
        {open ? (
          <View style={{ gap: 10 }}>
            {snapshot.templates.map((template) => (
              <Pressable key={template.id} onPress={() => setTemplateId(template.id)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <T style={{ fontWeight: template.id === templateId ? '600' : '400' }}>{template.name}</T>
                  {template.id === templateId ? <Pill label="Triada" tone="accent" /> : null}
                </View>
              </Pressable>
            ))}
            <Field label="A partir d'aquest dia" value={startDate} onChangeText={setStartDate} />
            <Stepper label="Setmanes" value={weeks} min={1} max={52} onChange={(value) => setWeeks(Math.round(value))} />
            <T variant="small" color={colors.muted}>Les sessions ja fetes es queden. Les pendents des d’aquest dia se substitueixen.</T>
            <Button
              label={active ? 'Substitueix el pla' : 'Crea el pla'}
              disabled={!templateId || !isIsoDate(startDate)}
              onPress={() => {
                assign({ templateId, clientId, startDate, weeks }).then(() => setOpen(false));
              }}
            />
          </View>
        ) : null}
      </Card>
      {history.length > 0 ? (
        <Card style={{ gap: 8 }}>
          <T variant="label">Plantilles anteriors</T>
          {history.map((plan) => (
            <T key={plan.id}>{plan.name} · del {formatLongDate(plan.startDate)} al {formatLongDate(plan.endDate)}</T>
          ))}
        </Card>
      ) : null}
    </View>
  );
}
