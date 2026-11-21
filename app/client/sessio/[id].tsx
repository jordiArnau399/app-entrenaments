import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FEELING_LABEL, formatCardio, formatStrength, paceSecPerKm, rpeCaption } from '../../../src/domain/format';
import type { SessionFeeling } from '../../../src/domain/types';
import { useApp, useSnapshot } from '../../../src/state/store';
import { Screen, syncCopy } from '../../../src/ui/shell';
import { colors } from '../../../src/ui/theme';
import { ExerciseVideoButton } from '../../../src/ui/ExerciseVideo';
import { Button, Card, ExerciseGlyph, Stepper, T, Field, Pill } from '../../../src/ui/ui';

type Draft = { sets: { weightKg: number; reps: number }[]; minutes: number; km: number };

export default function SessionLogger() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const snapshot = useSnapshot();
  const { logSession, setOffline, pending, hub } = useApp();
  const insets = useSafeAreaInsets();
  const session = snapshot.sessions.find((item) => item.id === id);
  const [step, setStep] = useState(0);
  const [feeling, setFeeling] = useState<SessionFeeling>('be');
  const [rpe, setRpe] = useState(6);
  const [notes, setNotes] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    (session?.exercises ?? []).map((exercise) => ({
      sets: exercise.strength
        ? Array.from({ length: exercise.strength.sets }, () => ({
            weightKg: exercise.strength!.weightKg,
            reps: exercise.strength!.reps,
          }))
        : [],
      minutes: Math.round((exercise.cardio?.durationSec ?? 0) / 60),
      km: Math.round(((exercise.cardio?.distanceM ?? 0) / 1000) * 10) / 10,
    })),
  );
  if (!session || session.clientId !== snapshot.settings.clientId) {
    return (
      <Screen narrow>
        <T>No s'ha trobat la sessió.</T>
        <Button label="Torna a avui" onPress={() => router.replace('/client')} />
      </Screen>
    );
  }
  const sync = syncCopy(snapshot.settings.offline, pending, hub);
  const total = session.exercises.length;
  const summary = step >= total;
  const exercise = session.exercises[step];
  const catalog = exercise ? snapshot.exercises.find((item) => item.id === exercise.exerciseId) : undefined;
  const draft = drafts[step];

  const updateSet = (index: number, patch: Partial<Draft['sets'][number]>) => {
    setDrafts((current) =>
      current.map((item, itemIndex) =>
        itemIndex !== step ? item : { ...item, sets: item.sets.map((set, setIndex) => (setIndex === index ? { ...set, ...patch } : set)) },
      ),
    );
  };

  return (
    <Screen narrow>
      <View style={{ paddingTop: insets.top ? 0 : 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable onPress={() => (step === 0 ? router.replace('/client') : setStep((value) => value - 1))}>
          <T>← Enrere</T>
        </Pressable>
        <T variant="small" color={sync.color}>{sync.label}</T>
      </View>
      <T variant="label">{summary ? 'Tancar la sessió' : `${step + 1} de ${total}`}</T>
      {summary ? (
        <Card style={{ gap: 14 }}>
          <T variant="section">Com ha anat?</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(Object.keys(FEELING_LABEL) as SessionFeeling[]).map((key) => (
              <Pressable key={key} onPress={() => setFeeling(key)}>
                <Pill label={FEELING_LABEL[key]} tone={feeling === key ? 'accent' : 'neutral'} />
              </Pressable>
            ))}
          </View>
          <T variant="label">Esforç percebut · {rpeCaption(rpe)}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
              <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Esforç ${value}`} onPress={() => setRpe(value)} style={{ width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: rpe === value ? colors.accent : colors.paperDeep }}>
                <T color={rpe === value ? colors.surface : colors.ink} style={{ fontWeight: '600' }}>{value}</T>
              </Pressable>
            ))}
          </View>
          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Opcional" multiline />
          <T color={colors.muted}>
            {snapshot.settings.offline
              ? 'Sense connexió: es desarà al telèfon i se sincronitzarà quan torni la xarxa.'
              : 'Es desa primer aquí i després se sincronitza.'}
          </T>
          <Button
            label={snapshot.settings.offline ? 'Treballa amb connexió' : 'Simula sense connexió'}
            tone="secondary"
            onPress={() => setOffline(!snapshot.settings.offline)}
          />
          <Button
            label="Desa la sessió"
            onPress={() => {
              logSession({
                sessionId: session.id,
                feeling,
                rpe,
                notes,
                exercises: session.exercises.map((planned, index) => {
                  const current = drafts[index];
                  const distanceM = Math.round(current.km * 1000);
                  const durationSec = current.minutes * 60;
                  return {
                    plannedExerciseId: planned.id,
                    sets: planned.strength ? current.sets : null,
                    durationSec: planned.cardio ? durationSec : null,
                    distanceM: planned.cardio ? distanceM : null,
                  };
                }),
              }).then((ok) => {
                if (ok) router.replace('/client');
              });
            }}
          />
        </Card>
      ) : exercise && draft ? (
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <ExerciseGlyph type={catalog?.type ?? (exercise.cardio ? 'cardio' : 'strength')} />
            <View style={{ flex: 1 }}>
              <T variant="section">{catalog?.name ?? 'Exercici'}</T>
              <T variant="small">Planificat {exercise.strength ? formatStrength(exercise.strength) : exercise.cardio ? formatCardio(exercise.cardio) : '—'}</T>
            </View>
          </View>
          {catalog?.description ? <T color={colors.muted}>{catalog.description}</T> : null}
          <ExerciseVideoButton videoUrl={catalog?.videoUrl} />
          {exercise.strength
            ? draft.sets.map((set, index) => (
                <View key={`${exercise.id}-${index}`} style={{ gap: 8 }}>
                  <T variant="label">Sèrie {index + 1}</T>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Stepper label="Kg" value={set.weightKg} step={2.5} max={400} onChange={(weightKg) => updateSet(index, { weightKg })} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Stepper label="Reps" value={set.reps} min={0} max={30} onChange={(reps) => updateSet(index, { reps })} />
                    </View>
                  </View>
                </View>
              ))
            : (
              <View style={{ gap: 8 }}>
                <Stepper label="Minuts" value={draft.minutes} min={1} max={240} onChange={(minutes) => setDrafts((current) => current.map((item, index) => (index === step ? { ...item, minutes } : item)))} />
                <Stepper label="Quilòmetres" value={draft.km} step={0.1} max={100} suffix="km" onChange={(km) => setDrafts((current) => current.map((item, index) => (index === step ? { ...item, km } : item)))} />
                <T variant="small">Ritme {paceSecPerKm(draft.minutes * 60, Math.round(draft.km * 1000)) ? formatPaceSafe(draft.minutes * 60, Math.round(draft.km * 1000)) : '—'}</T>
              </View>
            )}
          {exercise.strength ? (
            <Button
              label="Afegeix una sèrie"
              tone="secondary"
              onPress={() =>
                setDrafts((current) =>
                  current.map((item, index) =>
                    index === step
                      ? { ...item, sets: [...item.sets, item.sets[item.sets.length - 1] ?? { weightKg: exercise.strength!.weightKg, reps: exercise.strength!.reps }] }
                      : item,
                  ),
                )
              }
            />
          ) : null}
          <Button label={step === total - 1 ? 'Acaba i valora' : 'Següent exercici'} onPress={() => setStep((value) => value + 1)} />
        </Card>
      ) : null}
    </Screen>
  );
}

function formatPaceSafe(durationSec: number, distanceM: number): string {
  const pace = paceSecPerKm(durationSec, distanceM);
  if (!pace) return '—';
  const minutes = Math.floor(pace / 60);
  const seconds = pace % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`;
}
