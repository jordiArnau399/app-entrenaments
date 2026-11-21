/**
 * Model de dades de Ritme.
 * Cada registre penja d'un entrenador (directament o via el client).
 * Els registres creats al dispositiu porten id local i syncStatus.
 * Missatges i notificacions estan al model per a la fase 2; el MVP no en té pantalla.
 */

export type SyncStatus = 'pending' | 'synced';

export type ExerciseType = 'strength' | 'cardio';

export type SessionStatus = 'pending' | 'done' | 'skipped';

export type SessionFeeling = 'molt_be' | 'be' | 'normal' | 'dur' | 'molt_dur';

export type Trainer = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type Client = {
  id: string;
  trainerId: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

export type Exercise = {
  id: string;
  trainerId: string;
  name: string;
  type: ExerciseType;
  category: string;
  description: string;
  /** Imatge (MVP). Una URL http o buida; les il·lustracions de sèrie es dibuixen a l'app. */
  imageUrl: string | null;
  /** Fase 2: vídeo. El camp hi és; l'editor del MVP no el demana. */
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StrengthTarget = {
  sets: number;
  reps: number;
  weightKg: number;
};

export type CardioTarget = {
  durationSec: number;
  distanceM: number;
  paceSecPerKm: number | null;
};

/** Una línia d'exercici dins d'un dia de plantilla, pla o sessió. */
export type ExerciseTarget = {
  id: string;
  exerciseId: string;
  /** A les sessions, id de la línia del pla de la qual prové. Serveix per personalitzar el futur. */
  sourceItemId?: string;
  sortOrder: number;
  notes: string;
  strength: StrengthTarget | null;
  cardio: CardioTarget | null;
};

export type PlanDay = {
  id: string;
  /** 0 dilluns … 6 diumenge */
  weekday: number;
  name: string;
  exercises: ExerciseTarget[];
};

export type Template = {
  id: string;
  trainerId: string;
  name: string;
  description: string;
  days: PlanDay[];
  createdAt: string;
  updatedAt: string;
};

export type AssignedPlan = {
  id: string;
  clientId: string;
  trainerId: string;
  sourceTemplateId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'paused' | 'completed';
  /** Còpia independent de la plantilla. */
  days: PlanDay[];
  createdAt: string;
  updatedAt: string;
};

export type PlannedSession = {
  id: string;
  planId: string;
  clientId: string;
  trainerId: string;
  date: string;
  name: string;
  status: SessionStatus;
  exercises: ExerciseTarget[];
  updatedAt: string;
};

export type SetLog = {
  weightKg: number;
  reps: number;
};

export type ExerciseLog = {
  id: string;
  exerciseId: string;
  plannedExerciseId: string;
  sets: SetLog[] | null;
  durationSec: number | null;
  distanceM: number | null;
  paceSecPerKm: number | null;
  /** Objectiu copiat en el moment de registrar. Canviar el pla després no el reescriu. */
  plannedSets: number | null;
  plannedReps: number | null;
  plannedWeightKg: number | null;
  plannedDurationSec: number | null;
  plannedDistanceM: number | null;
};

export type SessionLog = {
  id: string;
  plannedSessionId: string;
  clientId: string;
  trainerId: string;
  startedAt: string;
  endedAt: string;
  feeling: SessionFeeling;
  rpe: number;
  notes: string;
  exercises: ExerciseLog[];
  syncStatus: SyncStatus;
  deviceId: string;
  updatedAt: string;
};

/** Fase 2. */
export type Message = {
  id: string;
  trainerId: string;
  clientId: string;
  senderId: string;
  recipientId: string;
  text: string;
  sentAt: string;
  status: 'sent' | 'received' | 'read';
  syncStatus: SyncStatus;
  updatedAt: string;
};

/** Fase 2: avisos a l'entrenador i recordatoris. */
export type AppNotification = {
  id: string;
  trainerId: string;
  recipientId: string;
  type: 'reminder' | 'session_completed' | 'session_skipped' | 'message';
  refId: string | null;
  createdAt: string;
  read: boolean;
};

export type Settings = {
  offline: boolean;
  reminderTime: string;
  role: 'trainer' | 'client' | null;
  trainerId: string | null;
  clientId: string | null;
  deviceId: string;
};

export type DataCollections = {
  trainers: Trainer[];
  clients: Client[];
  exercises: Exercise[];
  templates: Template[];
  plans: AssignedPlan[];
  sessions: PlannedSession[];
  logs: SessionLog[];
  messages: Message[];
  notifications: AppNotification[];
};

export type Snapshot = DataCollections & {
  settings: Settings;
};

export const TRAINER_ID = 'trn_jordi';
export const CLIENT_MARTA = 'cli_marta';
export const CLIENT_PAU = 'cli_pau';
export const TEMPLATE_STRENGTH = 'tpl_forca3';
export const TEMPLATE_MIXED = 'tpl_forca_cardio';
