import { describe, expect, it } from 'vitest';
import { canAccess, createInviteCode, findOpenInvite, type Actor } from './access';

const trainer: Actor = { userId: 'trainer-1', role: 'trainer', trainerId: 'trainer-1' };
const otherTrainer: Actor = { userId: 'trainer-2', role: 'trainer', trainerId: 'trainer-2' };
const client: Actor = { userId: 'client-1', role: 'client', trainerId: 'trainer-1' };
const otherClient: Actor = { userId: 'client-2', role: 'client', trainerId: 'trainer-1' };

describe('permisos equivalents a les polítiques RLS', () => {
  it('un entrenador només veu i escriu els seus clients, plans i registres', () => {
    expect(canAccess(trainer, 'select', 'profile', { ownerId: 'client-1', trainerId: 'trainer-1' })).toBe(true);
    expect(canAccess(trainer, 'select', 'profile', { ownerId: 'client-9', trainerId: 'trainer-2' })).toBe(false);
    expect(canAccess(trainer, 'select', 'plan', { trainerId: 'trainer-1', clientId: 'client-1' })).toBe(true);
    expect(canAccess(trainer, 'update', 'plan', { trainerId: 'trainer-1', clientId: 'client-1' })).toBe(true);
    expect(canAccess(trainer, 'select', 'plan', { trainerId: 'trainer-2', clientId: 'client-9' })).toBe(false);
    expect(canAccess(trainer, 'select', 'session_log', { trainerId: 'trainer-1', clientId: 'client-1' })).toBe(true);
    expect(canAccess(trainer, 'insert', 'session_log', { trainerId: 'trainer-1', clientId: 'client-1' })).toBe(false);
    expect(canAccess(otherTrainer, 'select', 'session_log', { trainerId: 'trainer-1', clientId: 'client-1' })).toBe(false);
  });

  it('un client només veu el seu pla, les seves sessions i els seus resultats', () => {
    expect(canAccess(client, 'select', 'plan', { trainerId: 'trainer-1', clientId: 'client-1' })).toBe(true);
    expect(canAccess(client, 'update', 'plan', { trainerId: 'trainer-1', clientId: 'client-1' })).toBe(false);
    expect(canAccess(client, 'select', 'plan', { trainerId: 'trainer-1', clientId: 'client-2' })).toBe(false);
    expect(canAccess(client, 'select', 'session', { trainerId: 'trainer-1', clientId: 'client-1' })).toBe(true);
    expect(canAccess(client, 'update', 'session', { trainerId: 'trainer-1', clientId: 'client-1' })).toBe(true);
    expect(canAccess(client, 'insert', 'session', { trainerId: 'trainer-1', clientId: 'client-1' })).toBe(false);
    expect(canAccess(client, 'insert', 'session_log', { trainerId: 'trainer-1', clientId: 'client-1' })).toBe(true);
    expect(canAccess(client, 'insert', 'session_log', { trainerId: 'trainer-2', clientId: 'client-1' })).toBe(false);
    expect(canAccess(client, 'select', 'session_log', { trainerId: 'trainer-1', clientId: 'client-2' })).toBe(false);
    expect(canAccess(otherClient, 'update', 'session_log', { trainerId: 'trainer-1', clientId: 'client-1' })).toBe(false);
  });

  it('la biblioteca es llegeix dins del mateix entrenador i només ell l’escriu', () => {
    expect(canAccess(client, 'select', 'exercise', { trainerId: 'trainer-1' })).toBe(true);
    expect(canAccess(client, 'insert', 'exercise', { trainerId: 'trainer-1' })).toBe(false);
    expect(canAccess(client, 'select', 'template', { trainerId: 'trainer-2' })).toBe(false);
    expect(canAccess(trainer, 'delete', 'template', { trainerId: 'trainer-1' })).toBe(true);
    expect(canAccess(otherTrainer, 'update', 'exercise', { trainerId: 'trainer-1' })).toBe(false);
  });

  it('només l’entrenador crea invitacions obertes, i un codi usat no es pot repetir', () => {
    expect(canAccess(trainer, 'insert', 'invite', { trainerId: 'trainer-1', clientId: null, usedAt: null })).toBe(true);
    expect(canAccess(trainer, 'insert', 'invite', { trainerId: 'trainer-2', clientId: null, usedAt: null })).toBe(false);
    expect(canAccess(client, 'select', 'invite', { trainerId: 'trainer-1' })).toBe(false);
    const invites = [
      { code: 'AB12CD', usedAt: null, name: 'Pau' },
      { code: 'USED11', usedAt: '2026-11-21T00:00:00.000Z', name: 'Marta' },
    ];
    expect(findOpenInvite(invites, 'ab12cd')?.name).toBe('Pau');
    expect(findOpenInvite(invites, 'USED11')).toBeNull();
    expect(findOpenInvite(invites, 'NO')).toBeNull();
    expect(createInviteCode(() => 0)).toBe('AAAAAA');
  });
});
