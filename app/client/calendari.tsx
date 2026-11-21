import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { effectiveStatus } from '../../src/domain/compliance';
import { capitalize, formatLongDate, todayIso, WEEKDAYS_SHORT } from '../../src/domain/dates';
import { sessionOnDate } from '../../src/domain/report';
import { useSnapshot } from '../../src/state/store';
import { PageIntro, Screen } from '../../src/ui/shell';
import { colors } from '../../src/ui/theme';
import { Button, Card, T } from '../../src/ui/ui';

const MONTHS = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

export default function CalendarScreen() {
  const snapshot = useSnapshot();
  const clientId = snapshot.settings.clientId!;
  const today = todayIso();
  const [cursor, setCursor] = useState(() => {
    const [year, month] = today.split('-').map(Number);
    return { year, month };
  });
  const [selected, setSelected] = useState(today);
  const first = new Date(cursor.year, cursor.month - 1, 1);
  const pad = (first.getDay() + 6) % 7;
  const days = new Date(cursor.year, cursor.month, 0).getDate();
  const cells: Array<number | null> = [...Array(pad).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  const session = sessionOnDate(snapshot.sessions, snapshot.plans, clientId, selected);
  const status = session ? effectiveStatus(session.status, session.date, today) : null;
  return (
    <Screen narrow>
      <PageIntro title="Calendari" detail="Les sessions passades sense registre compten com a saltades. Encara les pots anotar." />
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button label="←" tone="secondary" onPress={() => setCursor((current) => shift(current, -1))} />
          <T variant="section">{capitalize(MONTHS[cursor.month - 1])} {cursor.year}</T>
          <Button label="→" tone="secondary" onPress={() => setCursor((current) => shift(current, 1))} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          {WEEKDAYS_SHORT.map((label) => (
            <T key={label} variant="small" style={{ flex: 1, textAlign: 'center' }}>{label}</T>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((day, index) => {
            if (!day) return <View key={`e${index}`} style={{ width: '14.28%', height: 44 }} />;
            const iso = `${cursor.year}-${String(cursor.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const item = sessionOnDate(snapshot.sessions, snapshot.plans, clientId, iso);
            const itemStatus = item ? effectiveStatus(item.status, item.date, today) : null;
            const color = itemStatus === 'done' ? colors.good : itemStatus === 'skipped' ? colors.bad : itemStatus === 'pending' ? colors.accent : 'transparent';
            const active = iso === selected;
            return (
              <Pressable key={iso} onPress={() => setSelected(iso)} style={{ width: '14.28%', height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: active ? colors.ink : 'transparent' }}>
                <T color={active ? colors.surface : colors.ink}>{day}</T>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: active ? colors.accent : color }} />
              </Pressable>
            );
          })}
        </View>
      </Card>
      <Card style={{ gap: 8 }}>
        <T variant="label">{capitalize(formatLongDate(selected))}</T>
        {session ? (
          <>
            <T variant="section">{session.name}</T>
            <T color={colors.muted}>{status === 'done' ? 'Feta' : status === 'skipped' ? 'Saltada' : 'Pendent'}</T>
            {status !== 'done' ? <Button label="Anota la sessió" onPress={() => router.push(`/client/sessio/${session.id}`)} /> : <T color={colors.good}>Ja està registrada.</T>}
          </>
        ) : (
          <T color={colors.muted}>Descans.</T>
        )}
      </Card>
    </Screen>
  );
}

function shift(current: { year: number; month: number }, delta: number): { year: number; month: number } {
  const date = new Date(current.year, current.month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}
