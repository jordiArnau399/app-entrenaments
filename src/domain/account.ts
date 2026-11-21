import type { AssignedPlan, Client, DataCollections, Exercise, Invite, Message, PlannedSession, SessionLog, Settings, Snapshot, Template, Trainer } from './types';

export type ProfileRecord = {
  id: string;
  role: 'trainer' | 'client';
  name: string;
  email: string;
  trainerId: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

export type CloudBundle = {
  profiles: ProfileRecord[];
  invites: Invite[];
  exercises: Exercise[];
  templates: Template[];
  plans: AssignedPlan[];
  sessions: PlannedSession[];
  logs: SessionLog[];
  messages: Message[];
};

export function blankSnapshot(deviceId: string): Snapshot {
  return {
    trainers: [],
    clients: [],
    exercises: [],
    templates: [],
    plans: [],
    sessions: [],
    logs: [],
    messages: [],
    notifications: [],
    invites: [],
    settings: {
      offline: false,
      reminderTime: '08:00',
      role: null,
      trainerId: null,
      clientId: null,
      deviceId,
      mode: 'demo',
      userId: null,
    },
  };
}

export function snapshotFromCloud(bundle: CloudBundle, userId: string, deviceId: string, previous?: Settings): Snapshot {
  const me = bundle.profiles.find((profile) => profile.id === userId);
  if (!me) throw new Error('No s\'ha trobat el perfil en aquest compte');
  const trainerId = me.role === 'trainer' ? me.id : me.trainerId;
  if (!trainerId) throw new Error('Aquest client no té entrenador');
  const trainers: Trainer[] = bundle.profiles
    .filter((profile) => profile.role === 'trainer' && (profile.id === me.id || profile.id === trainerId))
    .map(toTrainer);
  const clients: Client[] = bundle.profiles
    .filter((profile) => profile.role === 'client' && (profile.id === me.id || profile.trainerId === me.id))
    .map(toClient);
  return {
    trainers,
    clients,
    exercises: bundle.exercises,
    templates: bundle.templates,
    plans: bundle.plans,
    sessions: bundle.sessions,
    logs: bundle.logs,
    messages: bundle.messages,
    notifications: [],
    invites: me.role === 'trainer' ? bundle.invites : [],
    settings: {
      offline: previous?.offline ?? false,
      reminderTime: previous?.reminderTime ?? '08:00',
      role: me.role,
      trainerId,
      clientId: me.role === 'client' ? me.id : null,
      deviceId,
      mode: 'account',
      userId: me.id,
    },
  };
}

function toTrainer(profile: ProfileRecord): Trainer {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function toClient(profile: ProfileRecord): Client {
  return {
    id: profile.id,
    trainerId: profile.trainerId ?? '',
    name: profile.name,
    email: profile.email,
    status: profile.status,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export function collectionsOf(snapshot: Snapshot): DataCollections {
  return {
    trainers: snapshot.trainers,
    clients: snapshot.clients,
    exercises: snapshot.exercises,
    templates: snapshot.templates,
    plans: snapshot.plans,
    sessions: snapshot.sessions,
    logs: snapshot.logs,
    messages: snapshot.messages,
    notifications: snapshot.notifications,
    invites: snapshot.invites ?? [],
  };
}
