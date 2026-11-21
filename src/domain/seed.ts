import { assignTemplate, shiftTemplateToDate } from './assignPlan';
import { addDays, todayIso, weekStart } from './dates';
import { paceSecPerKm } from './format';
import { sequentialIds } from './ids';
import { createSessionLog } from './sessionLog';
import type {
  Client,
  Exercise,
  ExerciseTarget,
  Message,
  PlanDay,
  SessionFeeling,
  SessionLog,
  Snapshot,
  Template,
  Trainer,
} from './types';
import { CLIENT_MARTA, CLIENT_PAU, TEMPLATE_MIXED, TEMPLATE_STRENGTH, TRAINER_ID } from './types';

const FEELINGS: SessionFeeling[] = ['be', 'normal', 'molt_be', 'dur', 'be'];

function strength(id: string, exerciseId: string, sets: number, reps: number, weightKg: number, sort: number): ExerciseTarget {
  return { id, exerciseId, sortOrder: sort, notes: '', strength: { sets, reps, weightKg }, cardio: null };
}

function cardio(id: string, exerciseId: string, durationSec: number, distanceM: number, sort: number): ExerciseTarget {
  return {
    id,
    exerciseId,
    sortOrder: sort,
    notes: '',
    strength: null,
    cardio: { durationSec, distanceM, paceSecPerKm: paceSecPerKm(durationSec, distanceM) },
  };
}

function day(id: string, weekday: number, name: string, exercises: ExerciseTarget[]): PlanDay {
  return { id, weekday, name, exercises };
}

function cloneItem(item: ExerciseTarget, id: string): ExerciseTarget {
  return {
    ...item,
    id,
    strength: item.strength ? { ...item.strength } : null,
    cardio: item.cardio ? { ...item.cardio } : null,
  };
}

export function buildSeed(now = new Date()): Snapshot {
  const nowStamp = now.toISOString();
  const today = todayIso(now);
  const exercises = buildExercises(nowStamp);
  const templates = buildTemplates(nowStamp);
  const trainer: Trainer = {
    id: TRAINER_ID,
    name: 'Jordi Arnau',
    email: 'jordi@ritme.app',
    createdAt: nowStamp,
    updatedAt: nowStamp,
  };
  const clients: Client[] = [
    {
      id: CLIENT_MARTA,
      trainerId: TRAINER_ID,
      name: 'Marta Soler',
      email: 'marta@example.com',
      status: 'active',
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      id: CLIENT_PAU,
      trainerId: TRAINER_ID,
      name: 'Pau Vidal',
      email: 'pau@example.com',
      status: 'active',
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
  ];

  const ids = sequentialIds('seed');
  const mixed = templates.find((template) => template.id === TEMPLATE_MIXED)!;
  const strengthTemplate = templates.find((template) => template.id === TEMPLATE_STRENGTH)!;
  const martaStart = weekStart(addDays(today, -21));
  const marta = assignTemplate({
    template: mixed,
    clientId: CLIENT_MARTA,
    trainerId: TRAINER_ID,
    startDate: martaStart,
    weeks: 8,
    nowIso: nowStamp,
    ids,
  });
  const pau = assignTemplate({
    template: shiftTemplateToDate(strengthTemplate, today),
    clientId: CLIENT_PAU,
    trainerId: TRAINER_ID,
    startDate: weekStart(addDays(today, -21)),
    weeks: 8,
    nowIso: nowStamp,
    ids,
  });

  const plans = [marta.plan, pau.plan];
  const sessions = [...marta.sessions, ...pau.sessions];
  const logs = [
    ...logsFor(marta.sessions, today, ids, 'steady'),
    ...logsFor(pau.sessions, today, ids, 'uneven'),
  ];

  return {
    trainers: [trainer],
    clients,
    exercises,
    templates,
    plans,
    sessions,
    logs,
    messages: demoMessages(nowStamp),
    notifications: [],
    invites: [],
    settings: {
      offline: false,
      reminderTime: '08:00',
      role: null,
      trainerId: null,
      clientId: null,
      deviceId: 'dev_demo',
      mode: 'demo',
      userId: null,
    },
  };
}

function demoMessages(stamp: string): Message[] {
  const older = '2026-11-20T09:15:00.000Z';
  return [
    {
      id: 'msg_marta_1',
      trainerId: TRAINER_ID,
      clientId: CLIENT_MARTA,
      senderId: CLIENT_MARTA,
      recipientId: TRAINER_ID,
      text: 'Bon dia. Avui puc fer la força a la tarda?',
      sentAt: older,
      readAt: null,
      status: 'sent',
      syncStatus: 'synced',
      updatedAt: older,
    },
    {
      id: 'msg_marta_2',
      trainerId: TRAINER_ID,
      clientId: CLIENT_MARTA,
      senderId: TRAINER_ID,
      recipientId: CLIENT_MARTA,
      text: 'Sí. Mantén els pesos i atura’t si el ritme es dispara.',
      sentAt: '2026-11-20T09:22:00.000Z',
      readAt: '2026-11-20T09:30:00.000Z',
      status: 'read',
      syncStatus: 'synced',
      updatedAt: '2026-11-20T09:30:00.000Z',
    },
    {
      id: 'msg_pau_1',
      trainerId: TRAINER_ID,
      clientId: CLIENT_PAU,
      senderId: TRAINER_ID,
      recipientId: CLIENT_PAU,
      text: 'Com ha anat la sessió? El genoll esquerre, bé?',
      sentAt: stamp,
      readAt: null,
      status: 'sent',
      syncStatus: 'synced',
      updatedAt: stamp,
    },
  ];
}

function logsFor(
  sessions: Snapshot['sessions'],
  today: string,
  ids: ReturnType<typeof sequentialIds>,
  pattern: 'steady' | 'uneven',
) {
  const past = sessions.filter((session) => session.date < today).sort((a, b) => a.date.localeCompare(b.date));
  const counters: Record<string, number> = {};
  const logs: SessionLog[] = [];
  past.forEach((session, index) => {
    const last = index === past.length - 1;
    const skip = pattern === 'steady' ? index % 7 === 6 : index % 3 === 2 || last;
    if (skip) return;
    const endedAt = `${session.date}T18:30:00.000Z`;
    const { log, session: done } = createSessionLog({
      session,
      feeling: FEELINGS[index % FEELINGS.length],
      rpe: pattern === 'steady' ? 6 + (index % 3) : 5 + (index % 4),
      notes: index % 4 === 0 ? 'Bon ritme, sense molèsties.' : '',
      deviceId: 'dev_demo',
      endedAt,
      ids,
      exercises: session.exercises.map((planned) => {
        if (planned.strength) {
          const count = counters[planned.exerciseId] ?? 0;
          counters[planned.exerciseId] = count + 1;
          const weight = planned.strength.weightKg + count * 2.5;
          const reps = planned.strength.reps - (pattern === 'uneven' && index % 4 === 1 ? 1 : 0);
          return {
            plannedExerciseId: planned.id,
            sets: Array.from({ length: planned.strength.sets }, () => ({ weightKg: weight, reps })),
            durationSec: null,
            distanceM: null,
          };
        }
        return {
          plannedExerciseId: planned.id,
          sets: null,
          durationSec: planned.cardio?.durationSec ?? null,
          distanceM: planned.cardio?.distanceM ?? null,
        };
      }),
    });
    session.status = done.status;
    session.updatedAt = done.updatedAt;
    logs.push({ ...log, syncStatus: 'synced' as const });
  });
  return logs;
}

function buildExercises(stamp: string): Exercise[] {
  const rows: Array<Omit<Exercise, 'trainerId' | 'createdAt' | 'updatedAt' | 'imageUrl' | 'videoUrl'>> = [
    {
      id: 'ex_esquat',
      name: 'Esquat',
      type: 'strength',
      category: 'Cames',
      description: "Peus a l'amplada de les espatlles. Baixa fins que la cuixa quedi paral·lela al terra i puja empenyent el terra.",
    },
    {
      id: 'ex_banca',
      name: 'Press de banca',
      type: 'strength',
      category: 'Empenta',
      description: 'Estirat al banc, baixa la barra al pit i empeny fins a estendre els braços, amb els peus ferms a terra.',
    },
    {
      id: 'ex_rem',
      name: 'Rem amb barra',
      type: 'strength',
      category: 'Estirada',
      description: "Tronc lleugerament inclinat, tira la barra cap a l'abdomen i baixa controlant, sense arrodonir l'esquena.",
    },
    {
      id: 'ex_pes_mort',
      name: 'Pes mort',
      type: 'strength',
      category: 'Cadena posterior',
      description: "Barra a prop de les cames. Empeny el terra i posa't dret amb l'esquena neutra.",
    },
    {
      id: 'ex_militar',
      name: 'Press militar',
      type: 'strength',
      category: 'Empenta',
      description: 'Dret, amb la barra a les espatlles. Empeny-la per sobre el cap i torna a baixar sense arquear el lumbar.',
    },
    {
      id: 'ex_lunge',
      name: 'Lunge',
      type: 'strength',
      category: 'Cames',
      description: 'Fes una passa llarga i baixa el genoll del darrere a prop del terra. Alterna cames a cada repetició.',
    },
    {
      id: 'ex_correr',
      name: 'Córrer',
      type: 'cardio',
      category: 'Resistència',
      description: 'Ritme continu. Anota el temps i la distància. El ritme es calcula sol.',
    },
    {
      id: 'ex_bici',
      name: 'Bicicleta',
      type: 'cardio',
      category: 'Resistència',
      description: "Cadència constant. Si ets al gimnàs, la distància pot ser l'estimació de la màquina.",
    },
  ];
  return rows.map((row) => ({
    ...row,
    trainerId: TRAINER_ID,
    imageUrl: null,
    videoUrl: null,
    createdAt: stamp,
    updatedAt: stamp,
  }));
}

function buildTemplates(stamp: string): Template[] {
  const forcaA = [
    strength('ti_a1', 'ex_esquat', 4, 6, 80, 0),
    strength('ti_a2', 'ex_banca', 4, 8, 60, 1),
    strength('ti_a3', 'ex_rem', 3, 10, 50, 2),
  ];
  const forcaB = [
    strength('ti_b1', 'ex_pes_mort', 3, 5, 100, 0),
    strength('ti_b2', 'ex_militar', 3, 8, 40, 1),
    strength('ti_b3', 'ex_lunge', 3, 8, 24, 2),
  ];
  const forcaC = [
    strength('ti_c1', 'ex_esquat', 4, 8, 70, 0),
    strength('ti_c2', 'ex_banca', 3, 10, 55, 1),
    strength('ti_c3', 'ex_rem', 3, 12, 45, 2),
  ];
  const base: Template = {
    id: TEMPLATE_STRENGTH,
    trainerId: TRAINER_ID,
    name: 'Força 3 dies',
    description: 'Tres sessions de força a la setmana, amb els moviments bàsics.',
    createdAt: stamp,
    updatedAt: stamp,
    days: [
      day('td_a', 0, 'Força A', forcaA),
      day('td_b', 2, 'Força B', forcaB),
      day('td_c', 4, 'Força C', forcaC),
    ],
  };
  const mixed: Template = {
    id: TEMPLATE_MIXED,
    trainerId: TRAINER_ID,
    name: 'Força 3 + cardio 2',
    description: 'Tres dies de força i dos de cardio suau, per construir força sense deixar la resistència.',
    createdAt: stamp,
    updatedAt: stamp,
    days: [
      day('td_m_a', 0, 'Força A', forcaA.map((item, index) => cloneItem(item, `tm_a${index}`))),
      day('td_m_run', 1, 'Cardio · cursa', [cardio('tm_run', 'ex_correr', 30 * 60, 5000, 0)]),
      day('td_m_b', 2, 'Força B', forcaB.map((item, index) => cloneItem(item, `tm_b${index}`))),
      day('td_m_bike', 3, 'Cardio · bicicleta', [cardio('tm_bike', 'ex_bici', 40 * 60, 15000, 0)]),
      day('td_m_c', 4, 'Força C', forcaC.map((item, index) => cloneItem(item, `tm_c${index}`))),
    ],
  };
  return [base, mixed];
}
