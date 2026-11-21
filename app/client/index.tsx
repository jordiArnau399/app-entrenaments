import { router } from 'expo-router';
import { View } from 'react-native';
import { effectiveStatus } from '../../src/domain/compliance';
import { capitalize, formatLongDate, todayIso } from '../../src/domain/dates';
import { FEELING_LABEL, formatCardio, formatStrength } from '../../src/domain/format';
import { logForSession, todayAgenda } from '../../src/domain/report';
import { useApp, useSnapshot } from '../../src/state/store';
import { Screen, syncCopy } from '../../src/ui/shell';
import { colors } from '../../src/ui/theme';
import { Button, Card, ExerciseGlyph, T } from '../../src/ui/ui';

export default function TodayScreen() {
  const snapshot = useSnapshot();
  const { pending, hub, skipSession, syncNow } = useApp();
  const clientId = snapshot.settings.clientId!;
  const client = snapshot.clients.find((item) => item.id === clientId);
  const today = todayIso();
  const agenda = todayAgenda(snapshot.sessions, snapshot.plans, clientId, today);
  const session = agenda.session;
  const sync = syncCopy(snapshot.settings.offline, pending, hub);
  return (
    <Screen narrow onRefresh={syncNow}>
      <View style={{ gap: 4 }}>
        <T variant="label">{capitalize(formatLongDate(today))}</T>
        <T variant="title">{client ? `Hola, ${client.name.split(' ')[0]}` : 'Avui'}</T>
        <T variant="small" color={sync.color}>{sync.label}</T>
      </View>
      {!session ? (
        <Card style={{ gap: 8 }}>
          <T variant="section">
            {agenda.plan && agenda.plan.startDate > today ? 'El pla encara no ha començat' : agenda.plan ? 'Avui toca descans' : 'Encara no tens pla'}
          </T>
          {agenda.plan ? (
            <T color={colors.muted}>
              {agenda.plan.name}, del {formatLongDate(agenda.plan.startDate)} al {formatLongDate(agenda.plan.endDate)}.
            </T>
          ) : (
            <T color={colors.muted}>Quan el teu entrenador t’assigni un pla, el veuràs aquí. Estira la pantalla cap avall per actualitzar.</T>
          )}
          {agenda.upcoming.map((item) => (
            <T key={item.id}>
              {formatLongDate(item.date)} · {item.name}
            </T>
          ))}
        </Card>
      ) : (
        <TodayCard
          name={session.name}
          status={effectiveStatus(session.status, session.date, today)}
          feeling={logForSession(snapshot.logs, session.id)?.feeling}
          rpe={logForSession(snapshot.logs, session.id)?.rpe}
          onStart={() => router.push(`/client/sessio/${session.id}`)}
          onSkip={() => skipSession(session.id)}
          exercises={session.exercises.map((item) => {
            const exercise = snapshot.exercises.find((entry) => entry.id === item.exerciseId);
            return {
              id: item.id,
              name: exercise?.name ?? 'Exercici',
              type: exercise?.type ?? (item.cardio ? 'cardio' : 'strength'),
              target: item.strength ? formatStrength(item.strength) : item.cardio ? formatCardio(item.cardio) : '—',
            };
          })}
        />
      )}
    </Screen>
  );
}

function TodayCard({
  name,
  status,
  exercises,
  feeling,
  rpe,
  onStart,
  onSkip,
}: {
  name: string;
  status: 'pending' | 'done' | 'skipped';
  exercises: { id: string; name: string; type: 'strength' | 'cardio'; target: string }[];
  feeling?: keyof typeof FEELING_LABEL;
  rpe?: number;
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <Card style={{ gap: 14, padding: 8 }}>
      <View style={{ paddingHorizontal: 8, paddingTop: 8, gap: 4 }}>
        <T variant="section">{name}</T>
        <T color={colors.muted}>
          {exercises.length} {exercises.length === 1 ? 'exercici' : 'exercicis'}
          {status === 'done' && feeling && rpe ? ` · ${FEELING_LABEL[feeling]} · esforç ${rpe}` : ''}
          {status === 'skipped' ? ' · marcada com a saltada' : ''}
        </T>
      </View>
      {exercises.map((exercise) => (
        <View key={exercise.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 8 }}>
          <ExerciseGlyph type={exercise.type} size={48} />
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '600' }}>{exercise.name}</T>
            <T variant="small">{exercise.target}</T>
          </View>
        </View>
      ))}
      <View style={{ padding: 8, gap: 4 }}>
        {status === 'done' ? (
          <T color={colors.good}>Sessió registrada.</T>
        ) : (
          <>
            <Button label={status === 'skipped' ? 'Registrar-la igualment' : 'Comença la sessió'} onPress={onStart} />
            {status === 'pending' ? <Button label="Avui no puc" tone="ghost" onPress={onSkip} /> : null}
          </>
        )}
      </View>
    </Card>
  );
}
