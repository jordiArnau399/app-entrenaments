import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { formatShortDate } from '../domain/dates';
import type { ClientReport } from '../domain/report';
import type { Exercise } from '../domain/types';
import { colors } from './theme';
import { BarChart, ChartCard, LineChart } from './charts';
import { Card, Pill, T } from './ui';

export function ResultsPanel({ report, exercises }: { report: ClientReport; exercises: Exercise[] }) {
  const strength = exercises.filter((exercise) => exercise.type === 'strength');
  const withData = strength.filter((exercise) => (report.weights[exercise.id]?.length ?? 0) > 0);
  const initial = withData[0]?.id ?? strength[0]?.id ?? '';
  const [exerciseId, setExerciseId] = useState(initial);
  const selected = exerciseId || initial;
  const series = report.weights[selected] ?? [];
  const name = exercises.find((exercise) => exercise.id === selected)?.name ?? 'Exercici';
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(withData.length > 0 ? withData : strength).map((exercise) => (
          <Pressable key={exercise.id} accessibilityRole="button" onPress={() => setExerciseId(exercise.id)}>
            <Pill label={exercise.name} tone={exercise.id === selected ? 'accent' : 'neutral'} />
          </Pressable>
        ))}
      </View>
      <ChartCard title={`Pes aixecat · ${name}`} detail="El pes més alt de cada sessió.">
        <LineChart
          color={colors.accent}
          empty="Encara no hi ha sèries de força registrades."
          points={series.map((point) => ({ label: formatShortDate(point.date), value: point.weightKg }))}
        />
      </ChartCard>
      <ChartCard title="Sessions fetes" detail="Percentatge de cada setmana, sobre les sessions ja vençudes.">
        <BarChart
          empty="Sense sessions en aquest període."
          points={report.weekly.map((week) => ({ label: formatShortDate(week.weekStart), value: week.percent }))}
        />
      </ChartCard>
      <ChartCard title="Esforç percebut" detail={report.rpeAvg != null ? `Mitjana ${String(report.rpeAvg).replace('.', ',')} de 10.` : 'De l’1 al 10, al final de cada sessió.'}>
        <LineChart
          color={colors.cardio}
          empty="Encara no hi ha esforç registrat."
          points={report.rpe.map((point) => ({ label: formatShortDate(point.date), value: point.rpe }))}
        />
      </ChartCard>
      <Card>
        <T>{report.reading}</T>
      </Card>
    </View>
  );
}
