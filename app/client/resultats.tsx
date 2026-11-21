import { todayIso } from '../../src/domain/dates';
import { clientReport } from '../../src/domain/report';
import { useSnapshot } from '../../src/state/store';
import { PageIntro, Screen } from '../../src/ui/shell';
import { ResultsPanel } from '../../src/ui/results';

export default function ResultsScreen() {
  const snapshot = useSnapshot();
  const clientId = snapshot.settings.clientId!;
  const client = snapshot.clients.find((item) => item.id === clientId);
  const report = clientReport({
    clientId,
    today: todayIso(),
    plans: snapshot.plans,
    sessions: snapshot.sessions,
    logs: snapshot.logs,
    exercises: snapshot.exercises,
  });
  return (
    <Screen narrow>
      <PageIntro title="Resultats" detail={client ? `El progrés de ${client.name.split(' ')[0]}.` : undefined} />
      <ResultsPanel key={clientId} report={report} exercises={snapshot.exercises} />
    </Screen>
  );
}
