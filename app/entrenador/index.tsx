import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { greeting, todayIso } from '../../src/domain/dates';
import { clientReport, sessionOnDate } from '../../src/domain/report';
import { effectiveStatus } from '../../src/domain/compliance';
import { useSnapshot } from '../../src/state/store';
import { PageIntro, Screen } from '../../src/ui/shell';
import { colors } from '../../src/ui/theme';
import { Card, Pill, T } from '../../src/ui/ui';

export default function TrainerHome() {
  const snapshot = useSnapshot();
  const today = todayIso();
  const reports = snapshot.clients.map((client) => ({
    client,
    report: clientReport({
      clientId: client.id,
      today,
      plans: snapshot.plans,
      sessions: snapshot.sessions,
      logs: snapshot.logs,
      exercises: snapshot.exercises,
    }),
  }));
  const withDue = reports.filter((item) => item.report.weekCompliance.due > 0);
  const weekAverage = withDue.length
    ? Math.round(withDue.reduce((sum, item) => sum + item.report.weekCompliance.percent, 0) / withDue.length)
    : 0;
  const pendingToday = snapshot.clients.filter((client) => {
    const session = sessionOnDate(snapshot.sessions, snapshot.plans, client.id, today);
    return session && effectiveStatus(session.status, session.date, today) === 'pending';
  }).length;
  return (
    <Screen>
      <PageIntro eyebrow={greeting()} title={snapshot.trainers[0].name} detail="Això és el que han fet els teus clients." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Metric value={String(snapshot.clients.length)} label="Clients actius" />
        <Metric value={`${weekAverage}%`} label="Compliment d'aquesta setmana" />
        <Metric value={String(pendingToday)} label="Sessions pendents avui" />
      </View>
      <Card style={{ padding: 8 }}>
        <View style={{ paddingHorizontal: 8, paddingTop: 8 }}>
          <T variant="label">Clients</T>
        </View>
        {reports.map(({ client, report }) => (
          <Pressable key={client.id} accessibilityRole="button" onPress={() => router.push(`/entrenador/clients/${client.id}`)} style={{ padding: 12, borderTopWidth: 1, borderTopColor: colors.line, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <T style={{ fontWeight: '600' }}>{client.name}</T>
              <Pill label={report.status === 'al_dia' ? 'Al dia' : 'Endarrerit'} tone={report.status === 'al_dia' ? 'good' : 'warn'} />
            </View>
            <T variant="small">
              {report.activePlan?.name ?? 'Sense pla'} · {report.compliance.due === 0 ? 'sense sessions vençudes' : `${report.compliance.percent}% de compliment`}
              {report.rpeAvg != null ? ` · esforç ${String(report.rpeAvg).replace('.', ',')}` : ''}
            </T>
          </Pressable>
        ))}
      </Card>
      <Card>
        <T variant="section">Avui</T>
        <View style={{ gap: 10, marginTop: 8 }}>
          {snapshot.clients.map((client) => {
            const session = sessionOnDate(snapshot.sessions, snapshot.plans, client.id, today);
            const status = session ? effectiveStatus(session.status, session.date, today) : null;
            return (
              <View key={client.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <T>{client.name}</T>
                <T color={colors.muted}>{session ? `${session.name} · ${status === 'done' ? 'feta' : status === 'skipped' ? 'saltada' : 'pendent'}` : 'Descans'}</T>
              </View>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <Card style={{ flexGrow: 1, flexBasis: 180, gap: 4 }}>
      <T variant="title">{value}</T>
      <T variant="small">{label}</T>
    </Card>
  );
}
