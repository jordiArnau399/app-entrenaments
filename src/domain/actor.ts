import { TRAINER_ID, type Snapshot } from './types';

/** L'entrenador d'aquest compte. Un client el porta a la fitxa; un entrenador és ell mateix. */
export function currentTrainerId(snapshot: Pick<Snapshot, 'settings' | 'trainers' | 'clients'>): string | null {
  const { settings } = snapshot;
  if (settings.role === 'client') {
    return settings.trainerId ?? snapshot.clients.find((client) => client.id === settings.clientId)?.trainerId ?? null;
  }
  if (settings.role === 'trainer' || settings.role === 'admin') {
    return settings.userId ?? settings.trainerId;
  }
  return settings.trainerId ?? settings.userId ?? snapshot.trainers.find((trainer) => trainer.id === TRAINER_ID)?.id ?? null;
}

export function currentUserName(snapshot: Pick<Snapshot, 'settings' | 'trainers' | 'clients'>): string {
  const id = snapshot.settings.userId ?? snapshot.settings.trainerId ?? currentTrainerId(snapshot);
  return (
    snapshot.trainers.find((trainer) => trainer.id === id)?.name ??
    snapshot.clients.find((client) => client.id === snapshot.settings.clientId)?.name ??
    snapshot.trainers.find((trainer) => trainer.id === TRAINER_ID)?.name ??
    ''
  );
}
