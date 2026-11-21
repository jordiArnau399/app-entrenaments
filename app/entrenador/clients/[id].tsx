import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { effectiveStatus } from '../../../src/domain/compliance';
import { addDays, capitalize, formatLongDate, formatShortDate, WEEKDAYS_CA, todayIso } from '../../../src/domain/dates';
import { FEELING_LABEL, formatCardio, formatStrength, paceSecPerKm } from '../../../src/domain/format';
import { compareSession, sessionScore } from '../../../src/domain/metrics';
import { clientReport, logForSession } from '../../../src/domain/report';
import type { ExerciseTarget } from '../../../src/domain/types';
import { useApp, useSnapshot } from '../../../src/state/store';
import { PageIntro, Screen, useWide } from '../../../src/ui/shell';
import { ResultsPanel } from '../../../src/ui/results';
import { colors } from '../../../src/ui/theme';
import { Button, Card, Pill, Stepper, T } from '../../../src/ui/ui';

export default function ClientFollowUp() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const snapshot = useSnapshot();
  const wide = useWide();
  const today = todayIso();
  const client = snapshot.clients.find((item) => item.id === id);
  const [tab, setTab] = useState<'seguiment' | 'pla'>('seguiment');
  const [openId, setOpenId] = useState<string | null>(null);
  if (!client) {
    return (
      <Screen>
        <T>No s'ha trobat el client.</T>
      </Screen>
    );
  }
  const report = clientReport({
    clientId: client.id,
    today,
    plans: snapshot.plans,
    sessions: snapshot.sessions,
    logs: snapshot.logs,
    exercises: snapshot.exercises,
  });
  const from = addDays(today, -35);
  const to = addDays(today, 21);
  const sessions = snapshot.sessions
    .filter((session) => session.clientId === client.id && session.date >= from && session.date <= to)
    .slice()
    .sort((a, b) => dayDistance(a.date, today) - dayDistance(b.date, today) || b.date.localeCompare(a.date))
    .slice(0, 8);
  return (
    <Screen>
      <Pressable onPress={() => router.push('/entrenador/clients')}>
        <T variant="small">← Clients</T>
      </Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <PageIntro eyebrow="Seguiment" title={client.name} detail={client.email || 'Sense correu'} />
        <Pill label={report.status === 'al_dia' ? 'Al dia' : 'Endarrerit'} tone={report.status === 'al_dia' ? 'good' : 'warn'} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Stat value={report.compliance.due === 0 ? '—' : `${report.compliance.percent}%`} label="Compliment del pla" />
        <Stat value={report.rpeAvg != null ? String(report.rpeAvg).replace('.', ',') : '—'} label="Esforç mitjà" />
        <Stat value={String(report.compliance.done)} label="Sessions fetes" />
      </View>
      <T color={colors.muted}>
        {report.activePlan
          ? `${report.activePlan.name}, del ${formatLongDate(report.activePlan.startDate)} al ${formatLongDate(report.activePlan.endDate)}.`
          : 'Aquest client encara no té un pla actiu.'}
      </T>
      <Button label="Obre el xat" tone="secondary" onPress={() => router.push(`/entrenador/xat/${client.id}`)} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => setTab('seguiment')}>
          <Pill label="Seguiment" tone={tab === 'seguiment' ? 'accent' : 'neutral'} />
        </Pressable>
        <Pressable onPress={() => setTab('pla')}>
          <Pill label="Pla" tone={tab === 'pla' ? 'accent' : 'neutral'} />
        </Pressable>
      </View>
      {tab === 'pla' && report.activePlan ? (
        <PlanEditor key={report.activePlan.updatedAt} planId={report.activePlan.id} days={report.activePlan.days} />
      ) : null}
      {tab === 'seguiment' ? (
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
          <View style={{ flex: 1.15, width: '100%', gap: 10 }}>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {sessions.length === 0 ? (
                <View style={{ padding: 16 }}>
                  <T color={colors.muted}>Encara no hi ha sessions en aquest pla.</T>
                </View>
              ) : (
                sessions.map((session) => {
                  const status = effectiveStatus(session.status, session.date, today);
                  const log = logForSession(snapshot.logs, session.id);
                  const comparison = compareSession(session, log, snapshot.exercises);
                  const score = sessionScore(comparison);
                  const open = openId === session.id;
                  return (
                    <View key={session.id} style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
                      <Pressable onPress={() => setOpenId(open ? null : session.id)} style={{ padding: 14, gap: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                          <T style={{ fontWeight: '600' }}>
                            {capitalize(formatShortDate(session.date))} · {session.name}
                          </T>
                          <Pill label={status === 'done' ? 'Feta' : status === 'skipped' ? 'Saltada' : 'Pendent'} tone={status === 'done' ? 'good' : status === 'skipped' ? 'bad' : 'accent'} />
                        </View>
                        <T variant="small">
                          {status === 'done' ? `${score.met}/${score.total} dins l'objectiu` : 'Objectiu encara no registrat'}
                          {log ? ` · esforç ${log.rpe} · ${FEELING_LABEL[log.feeling]}` : ''}
                        </T>
                      </Pressable>
                      {open ? (
                        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
                          {comparison.map((item) => (
                            <View key={item.exerciseId + item.plannedLabel} style={{ gap: 2 }}>
                              <T style={{ fontWeight: '600' }}>{item.name}</T>
                              <T variant="small">Planificat {item.plannedLabel}</T>
                              <T variant="small" color={item.met ? colors.good : colors.muted}>
                                Fet {item.actualLabel}
                                {status === 'done' ? ` · ${item.met ? 'assolit' : 'per sota'}` : ''}
                              </T>
                            </View>
                          ))}
                          {log?.notes ? <T color={colors.muted}>{log.notes}</T> : null}
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </Card>
          </View>
          <View style={{ flex: 1, width: '100%' }}>
            <ResultsPanel key={client.id} report={report} exercises={snapshot.exercises} />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function dayDistance(iso: string, today: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
  return Math.abs(new Date(year, month - 1, day).getTime() - new Date(todayYear, todayMonth - 1, todayDay).getTime());
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={{ flexGrow: 1, flexBasis: 160, gap: 4 }}>
      <T variant="title">{value}</T>
      <T variant="small">{label}</T>
    </Card>
  );
}

function PlanEditor({ planId, days }: { planId: string; days: { id: string; weekday: number; name: string; exercises: ExerciseTarget[] }[] }) {
  const snapshot = useSnapshot();
  const { addExerciseToPlan } = useApp();
  const [adding, setAdding] = useState<string | null>(null);
  return (
    <View style={{ gap: 12 }}>
      <T color={colors.muted}>
        Aquests canvis són només d'aquest pla. Les sessions pendents d'avui i les futures s'actualitzen; les ja fetes conserven l'objectiu que tenien.
      </T>
      {days
        .slice()
        .sort((a, b) => a.weekday - b.weekday)
        .map((day) => (
          <Card key={day.id} style={{ gap: 12 }}>
            <T variant="section">
              {capitalize(WEEKDAYS_CA[day.weekday])} · {day.name}
            </T>
            {day.exercises.map((item) => (
              <TargetRow key={item.id} planId={planId} item={item} />
            ))}
            <Button label="Afegeix un exercici" tone="secondary" onPress={() => setAdding(adding === day.id ? null : day.id)} />
            {adding === day.id ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {snapshot.exercises.map((exercise) => (
                  <Pressable key={exercise.id} onPress={() => addExerciseToPlan(planId, day.id, exercise.id).then(() => setAdding(null))}>
                    <Pill label={exercise.name} tone="neutral" />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Card>
        ))}
    </View>
  );
}

function TargetRow({ planId, item }: { planId: string; item: ExerciseTarget }) {
  const snapshot = useSnapshot();
  const { updatePlanExercise, removeExerciseFromPlan } = useApp();
  const exercise = snapshot.exercises.find((entry) => entry.id === item.exerciseId);
  const [sets, setSets] = useState(item.strength?.sets ?? 3);
  const [reps, setReps] = useState(item.strength?.reps ?? 8);
  const [weight, setWeight] = useState(item.strength?.weightKg ?? 20);
  const [minutes, setMinutes] = useState(Math.round((item.cardio?.durationSec ?? 1200) / 60));
  const [km, setKm] = useState(Math.round(((item.cardio?.distanceM ?? 0) / 1000) * 10) / 10);
  const save = () => {
    if (item.cardio) {
      const distanceM = Math.round(km * 1000);
      const durationSec = minutes * 60;
      updatePlanExercise(planId, item.id, {
        cardio: { durationSec, distanceM, paceSecPerKm: paceSecPerKm(durationSec, distanceM) },
      });
      return;
    }
    updatePlanExercise(planId, item.id, { strength: { sets, reps, weightKg: weight } });
  };
  return (
    <View style={{ gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
      <T style={{ fontWeight: '600' }}>{exercise?.name ?? 'Exercici'}</T>
      <T variant="small">Ara: {item.strength ? formatStrength(item.strength) : item.cardio ? formatCardio(item.cardio) : '—'}</T>
      {item.strength ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Stepper label="Sèries" value={sets} min={1} max={12} onChange={setSets} />
          <Stepper label="Reps" value={reps} min={1} max={30} onChange={setReps} />
          <Stepper label="Pes" value={weight} step={2.5} max={400} suffix="kg" onChange={setWeight} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Stepper label="Minuts" value={minutes} min={1} max={180} onChange={setMinutes} />
          <Stepper label="Quilòmetres" value={km} step={0.5} max={80} suffix="km" onChange={setKm} />
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="Desa en aquest pla" tone="secondary" onPress={save} />
        <Button label="Treu" tone="ghost" onPress={() => removeExerciseFromPlan(planId, item.id)} />
      </View>
    </View>
  );
}
