import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { WEEKDAYS_SHORT } from '../../../src/domain/dates';
import { createId } from '../../../src/domain/ids';
import type { ExerciseTarget, Template } from '../../../src/domain/types';
import { useApp, useSnapshot } from '../../../src/state/store';
import { PageIntro, Screen } from '../../../src/ui/shell';
import { colors } from '../../../src/ui/theme';
import { Button, Card, Field, Pill, Stepper, T } from '../../../src/ui/ui';

export default function TemplateEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const snapshot = useSnapshot();
  const { saveTemplate } = useApp();
  const existing = snapshot.templates.find((template) => template.id === id);
  const initial = useMemo(() => existing ?? blankTemplate(), [existing]);
  const [draft, setDraft] = useState<Template>(initial);
  const [loadedId, setLoadedId] = useState(id);
  if (loadedId !== id) {
    setLoadedId(id);
    setDraft(existing ?? blankTemplate());
  }
  const [picking, setPicking] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const updateDay = (dayId: string, patch: Partial<Template['days'][number]>) => {
    setDraft((current) => ({
      ...current,
      days: current.days.map((day) => (day.id === dayId ? { ...day, ...patch } : day)),
    }));
  };

  const updateItem = (dayId: string, itemId: string, patch: Partial<ExerciseTarget>) => {
    setDraft((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id !== dayId
          ? day
          : { ...day, exercises: day.exercises.map((item) => (item.id === itemId ? { ...item, ...patch } : item)) },
      ),
    }));
  };

  return (
    <Screen>
      <PageIntro
        eyebrow="Plantilla"
        title={existing ? draft.name || 'Sense nom' : 'Nova plantilla'}
        detail="Els plans ja assignats no canvien quan deses aquí."
      />
      <Card style={{ gap: 12 }}>
        <Field label="Nom" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="Força 3 dies" />
        <Field label="Descripció" value={draft.description} onChangeText={(description) => setDraft({ ...draft, description })} multiline />
      </Card>
      {draft.days
        .slice()
        .sort((a, b) => a.weekday - b.weekday)
        .map((day) => (
          <Card key={day.id} style={{ gap: 12 }}>
            <Field label="Nom del dia" value={day.name} onChangeText={(name) => updateDay(day.id, { name })} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {WEEKDAYS_SHORT.map((label, weekday) => (
                <Pressable key={label} onPress={() => updateDay(day.id, { weekday })}>
                  <Pill label={label} tone={day.weekday === weekday ? 'accent' : 'neutral'} />
                </Pressable>
              ))}
            </View>
            {day.exercises.map((item) => {
              const exercise = snapshot.exercises.find((entry) => entry.id === item.exerciseId);
              return (
                <View key={item.id} style={{ gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <T style={{ fontWeight: '600' }}>{exercise?.name ?? 'Exercici'}</T>
                    <Button
                      label="Treu"
                      tone="ghost"
                      onPress={() =>
                        updateDay(day.id, {
                          exercises: day.exercises.filter((entry) => entry.id !== item.id),
                        })
                      }
                    />
                  </View>
                  {item.strength ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <Stepper label="Sèries" value={item.strength.sets} min={1} max={12} onChange={(sets) => updateItem(day.id, item.id, { strength: { ...item.strength!, sets } })} />
                      <Stepper label="Reps" value={item.strength.reps} min={1} max={30} onChange={(reps) => updateItem(day.id, item.id, { strength: { ...item.strength!, reps } })} />
                      <Stepper label="Pes" value={item.strength.weightKg} step={2.5} max={400} suffix="kg" onChange={(weightKg) => updateItem(day.id, item.id, { strength: { ...item.strength!, weightKg } })} />
                    </View>
                  ) : null}
                  {item.cardio ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <Stepper
                        label="Minuts"
                        value={Math.round(item.cardio.durationSec / 60)}
                        min={1}
                        max={180}
                        onChange={(minutes) =>
                          updateItem(day.id, item.id, {
                            cardio: { ...item.cardio!, durationSec: minutes * 60 },
                          })
                        }
                      />
                      <Stepper
                        label="Quilòmetres"
                        value={Math.round((item.cardio.distanceM / 1000) * 10) / 10}
                        step={0.5}
                        max={100}
                        suffix="km"
                        onChange={(km) => updateItem(day.id, item.id, { cardio: { ...item.cardio!, distanceM: Math.round(km * 1000) } })}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
            <Button label="Afegeix un exercici" tone="secondary" onPress={() => setPicking(picking === day.id ? null : day.id)} />
            {picking === day.id ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {snapshot.exercises.map((exercise) => (
                  <Pressable
                    key={exercise.id}
                    onPress={() => {
                      const target: ExerciseTarget = {
                        id: createId('item'),
                        exerciseId: exercise.id,
                        sortOrder: day.exercises.length,
                        notes: '',
                        strength: exercise.type === 'strength' ? { sets: 3, reps: 8, weightKg: 20 } : null,
                        cardio: exercise.type === 'cardio' ? { durationSec: 20 * 60, distanceM: 3000, paceSecPerKm: 400 } : null,
                      };
                      updateDay(day.id, { exercises: [...day.exercises, target] });
                      setPicking(null);
                    }}
                  >
                    <Pill label={exercise.name} tone={exercise.type === 'cardio' ? 'cardio' : 'neutral'} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Button
              label="Treu aquest dia"
              tone="ghost"
              onPress={() => setDraft((current) => ({ ...current, days: current.days.filter((entry) => entry.id !== day.id) }))}
            />
          </Card>
        ))}
      <Button
        label="Afegeix un dia"
        tone="secondary"
        onPress={() =>
          setDraft((current) => ({
            ...current,
            days: [
              ...current.days,
              { id: createId('day'), weekday: current.days.length % 7, name: `Dia ${current.days.length + 1}`, exercises: [] },
            ],
          }))
        }
      />
      {localError ? <T color={colors.bad}>{localError}</T> : null}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Button
          label="Desa la plantilla"
          disabled={!draft.name.trim()}
          onPress={() => {
            const weekdays = draft.days.map((day) => day.weekday);
            if (new Set(weekdays).size !== weekdays.length) {
              setLocalError('Dos dies no poden caure el mateix dia de la setmana.');
              return;
            }
            if (draft.days.some((day) => day.exercises.length === 0)) {
              setLocalError('Cada dia ha de tenir almenys un exercici.');
              return;
            }
            setLocalError(null);
            saveTemplate(draft).then((saved) => {
              if (saved && saved !== id) router.replace(`/entrenador/plantilles/${saved}`);
            });
          }}
        />
        {existing ? <Button label="Assigna a un client" tone="secondary" onPress={() => router.push(`/entrenador/plantilles/${existing.id}/assigna`)} /> : null}
      </View>
    </Screen>
  );
}

function blankTemplate(): Template {
  return {
    id: 'nova',
    trainerId: '',
    name: '',
    description: '',
    days: [],
    createdAt: '',
    updatedAt: '',
  };
}
