import { describe, expect, it } from 'vitest';
import { explainSyncError, sortSyncOps } from './syncError';

describe('errors de la cua', () => {
  it('tradueix el rebuig de Supabase i conserva el missatge desconegut', () => {
    expect(explainSyncError('new row violates row-level security policy')).toMatch(/no és del teu compte/);
    expect(explainSyncError('invalid input syntax for type uuid: "trn_jordi"')).toMatch(/demostració/);
    expect(explainSyncError('JWT expired')).toMatch(/sessió ha caducat/);
    expect(explainSyncError('duplicate key value')).toBe('Supabase diu: duplicate key value');
  });

  it('envia el pla abans que les sessions', () => {
    const ordered = sortSyncOps([
      { entity: 'session' as const, createdAt: '2026-11-21T10:00:00.000Z' },
      { entity: 'plan' as const, createdAt: '2026-11-21T10:00:01.000Z' },
      { entity: 'session' as const, createdAt: '2026-11-21T09:00:00.000Z' },
    ]);
    expect(ordered.map((op) => op.entity)).toEqual(['plan', 'session', 'session']);
  });
});