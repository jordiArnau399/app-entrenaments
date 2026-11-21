import { formatCardio, formatKg, formatStrength, paceSecPerKm } from './format';
import type { Exercise, ExerciseLog, PlannedSession, SessionLog, SetLog } from './types';

export type WeightPoint = { date: string; weightKg: number };

export function maxWeightKg(sets: SetLog[] | null | undefined): number | null {
  if (!sets || sets.length === 0) return null;
  return sets.reduce((max, set) => Math.max(max, set.weightKg), 0);
}

/** Pes màxim de cada sessió, per a l'exercici triat. Una sessió, un punt. */
export function weightSeries(points: { date: string; exercises: ExerciseLog[] }[], exerciseId: string): WeightPoint[] {
  const byDate = new Map<string, number>();
  for (const point of points) {
    for (const exercise of point.exercises) {
      if (exercise.exerciseId !== exerciseId) continue;
      const weight = maxWeightKg(exercise.sets);
      if (weight == null) continue;
      const current = byDate.get(point.date);
      if (current == null || weight > current) byDate.set(point.date, weight);
    }
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, weightKg]) => ({ date, weightKg }));
}

export type WeightTrend = 'up' | 'flat' | 'down' | 'unknown';

export function weightTrend(series: WeightPoint[]): WeightTrend {
  if (series.length < 2) return 'unknown';
  const first = series[0].weightKg;
  const last = series[series.length - 1].weightKg;
  if (last > first + 0.4) return 'up';
  if (last < first - 0.4) return 'down';
  return 'flat';
}

export type RpePoint = { date: string; rpe: number };

export function rpeSeries(points: { date: string; rpe: number }[]): RpePoint[] {
  return points
    .filter((point) => point.rpe >= 1 && point.rpe <= 10)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function averageRpe(points: RpePoint[]): number | null {
  if (points.length === 0) return null;
  const total = points.reduce((sum, point) => sum + point.rpe, 0);
  return Math.round((total / points.length) * 10) / 10;
}

export function coachReading(input: {
  compliancePercent: number;
  due: number;
  rpeAvg: number | null;
  weightTrend: WeightTrend;
}): string {
  if (input.due === 0) return 'Encara no hi ha sessions vençudes per valorar el compliment.';
  if (input.compliancePercent < 60) {
    return "El compliment és baix. Convé parlar-hi: potser s'està desenganxant.";
  }
  if (input.rpeAvg != null && input.rpeAvg >= 8) {
    return "L'esforç és alt i sostingut. El pla pot ser massa dur.";
  }
  if (input.rpeAvg != null && input.rpeAvg <= 4 && (input.weightTrend === 'flat' || input.weightTrend === 'down')) {
    return 'Esforç baix i pes estancat. El pla pot ser massa fàcil.';
  }
  if (input.weightTrend === 'up') return 'El pes puja i el compliment aguanta. El ritme és bo.';
  return 'El ritme és estable. Mira el detall de cada sessió abans de canviar el pla.';
}

export type ExerciseComparison = {
  exerciseId: string;
  name: string;
  type: 'strength' | 'cardio';
  met: boolean;
  plannedLabel: string;
  actualLabel: string;
  plannedWeightKg: number | null;
  actualWeightKg: number | null;
  plannedSets: number | null;
  actualSets: number | null;
};

function strengthMet(plannedSets: number, plannedReps: number, plannedWeight: number, sets: SetLog[]): boolean {
  const good = sets.filter((set) => set.weightKg + 1e-6 >= plannedWeight && set.reps >= plannedReps);
  return good.length >= plannedSets;
}

function cardioMet(
  plannedDuration: number | null,
  plannedDistance: number | null,
  duration: number | null,
  distance: number | null,
): boolean {
  const checks: boolean[] = [];
  if (plannedDuration != null && plannedDuration > 0) checks.push((duration ?? 0) >= plannedDuration);
  if (plannedDistance != null && plannedDistance > 0) checks.push((distance ?? 0) + 1e-6 >= plannedDistance);
  if (checks.length === 0) return (duration ?? 0) > 0 || (distance ?? 0) > 0;
  return checks.every(Boolean);
}

function actualStrengthLabel(sets: SetLog[]): string {
  if (sets.length === 0) return 'Sense sèries';
  const weight = maxWeightKg(sets) ?? 0;
  const reps = Math.round(sets.reduce((sum, set) => sum + set.reps, 0) / sets.length);
  return `${sets.length} × ${reps} · ${formatKg(weight)}`;
}

export function compareSession(
  session: PlannedSession,
  log: SessionLog | null,
  exercises: Exercise[],
): ExerciseComparison[] {
  const nameOf = (exerciseId: string) => exercises.find((exercise) => exercise.id === exerciseId)?.name ?? 'Exercici';
  return session.exercises.map((planned) => {
    const logged = log?.exercises.find((item) => item.plannedExerciseId === planned.id) ?? null;
    const catalog = exercises.find((exercise) => exercise.id === planned.exerciseId);
    const type = catalog?.type ?? (planned.cardio ? 'cardio' : 'strength');
    if (type === 'cardio') {
      const plannedDuration = logged?.plannedDurationSec ?? planned.cardio?.durationSec ?? null;
      const plannedDistance = logged?.plannedDistanceM ?? planned.cardio?.distanceM ?? null;
      const pace = planned.cardio?.paceSecPerKm ?? paceSecPerKm(plannedDuration ?? 0, plannedDistance ?? 0);
      const plannedLabel = formatCardio({
        durationSec: plannedDuration ?? 0,
        distanceM: plannedDistance ?? 0,
        paceSecPerKm: pace,
      });
      const actualLabel = logged
        ? formatCardio({
            durationSec: logged.durationSec ?? 0,
            distanceM: logged.distanceM ?? 0,
            paceSecPerKm: logged.paceSecPerKm,
          })
        : 'Pendent';
      return {
        exerciseId: planned.exerciseId,
        type,
        met: logged
          ? cardioMet(plannedDuration, plannedDistance, logged.durationSec, logged.distanceM)
          : false,
        plannedLabel,
        actualLabel,
        plannedWeightKg: null,
        actualWeightKg: null,
        plannedSets: null,
        actualSets: null,
        name: nameOf(planned.exerciseId),
      };
    }
    const plannedSets = logged?.plannedSets ?? planned.strength?.sets ?? null;
    const plannedReps = logged?.plannedReps ?? planned.strength?.reps ?? null;
    const plannedWeight = logged?.plannedWeightKg ?? planned.strength?.weightKg ?? null;
    const sets = logged?.sets ?? [];
    const plannedLabel =
      plannedSets != null && plannedReps != null && plannedWeight != null
        ? formatStrength({ sets: plannedSets, reps: plannedReps, weightKg: plannedWeight })
        : '—';
    return {
      exerciseId: planned.exerciseId,
      type: 'strength',
      met:
        logged != null && plannedSets != null && plannedReps != null && plannedWeight != null
          ? strengthMet(plannedSets, plannedReps, plannedWeight, sets)
          : false,
      plannedLabel,
      actualLabel: logged ? actualStrengthLabel(sets) : 'Pendent',
      plannedWeightKg: plannedWeight,
      actualWeightKg: maxWeightKg(sets),
      plannedSets,
      actualSets: logged ? sets.length : null,
      name: nameOf(planned.exerciseId),
    };
  });
}

export function sessionScore(comparisons: ExerciseComparison[]): { met: number; total: number } {
  return {
    met: comparisons.filter((item) => item.met).length,
    total: comparisons.length,
  };
}
