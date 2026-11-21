import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { Exercise, ExerciseType } from '../../src/domain/types';
import { useApp, useSnapshot } from '../../src/state/store';
import { PageIntro, Screen } from '../../src/ui/shell';
import { colors } from '../../src/ui/theme';
import { Button, Card, ExerciseGlyph, Field, Pill, T } from '../../src/ui/ui';

const empty = { name: '', type: 'strength' as ExerciseType, category: '', description: '', imageUrl: '' };

export default function ExercisesScreen() {
  const snapshot = useSnapshot();
  const { saveExercise, deleteExercise } = useApp();
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);

  const start = (exercise?: Exercise) => {
    if (!exercise) {
      setEditing('nou');
      setDraft(empty);
      return;
    }
    setEditing(exercise.id);
    setDraft({
      name: exercise.name,
      type: exercise.type,
      category: exercise.category,
      description: exercise.description,
      imageUrl: exercise.imageUrl ?? '',
    });
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <PageIntro eyebrow="Biblioteca" title="Exercicis" detail="Força amb sèries, reps i pes. Cardio amb temps, distància i ritme." />
        <Button label="Nou exercici" onPress={() => start()} />
      </View>
      {editing ? (
        <Card style={{ gap: 12 }}>
          <Field label="Nom" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
          <T variant="label">Tipus</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setDraft({ ...draft, type: 'strength' })}>
              <Pill label="Força" tone={draft.type === 'strength' ? 'accent' : 'neutral'} />
            </Pressable>
            <Pressable onPress={() => setDraft({ ...draft, type: 'cardio' })}>
              <Pill label="Cardio" tone={draft.type === 'cardio' ? 'cardio' : 'neutral'} />
            </Pressable>
          </View>
          <Field label="Categoria" value={draft.category} onChangeText={(category) => setDraft({ ...draft, category })} placeholder="Cames, empenta, resistència…" />
          <Field label="Com es fa" value={draft.description} onChangeText={(description) => setDraft({ ...draft, description })} multiline />
          <Field label="Imatge (URL, opcional)" value={draft.imageUrl} onChangeText={(imageUrl) => setDraft({ ...draft, imageUrl })} placeholder="https://" />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button
              label="Desa l'exercici"
              disabled={!draft.name.trim()}
              onPress={() => {
                saveExercise({
                  id: editing === 'nou' ? undefined : editing,
                  name: draft.name,
                  type: draft.type,
                  category: draft.category,
                  description: draft.description,
                  imageUrl: draft.imageUrl || null,
                  videoUrl: null,
                }).then(() => setEditing(null));
              }}
            />
            <Button label="Cancel·la" tone="ghost" onPress={() => setEditing(null)} />
          </View>
        </Card>
      ) : null}
      <View style={{ gap: 10 }}>
        {snapshot.exercises.map((exercise) => (
          <Card key={exercise.id}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <ExerciseGlyph type={exercise.type} />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <T style={{ fontWeight: '600' }}>{exercise.name}</T>
                  <Pill label={exercise.type === 'strength' ? 'Força' : 'Cardio'} tone={exercise.type === 'strength' ? 'accent' : 'cardio'} />
                </View>
                <T variant="small">{exercise.category}</T>
                <T color={colors.muted}>{exercise.description}</T>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <Button label="Edita" tone="secondary" onPress={() => start(exercise)} />
                  <Button label="Esborra" tone="ghost" onPress={() => deleteExercise(exercise.id)} />
                </View>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
