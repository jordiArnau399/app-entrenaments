import { describe, expect, it } from 'vitest';
import { adherence, compliance, weeklyCompliance } from './compliance';

const today = '2026-11-21';

describe('compliment', () => {
  it('divideix sessions fetes entre les vençudes i deixa fora el futur', () => {
    const result = compliance(
      [
        { date: '2026-11-16', status: 'done' },
        { date: '2026-11-17', status: 'skipped' },
        { date: '2026-11-18', status: 'pending' },
        { date: '2026-11-21', status: 'pending' },
        { date: '2026-11-22', status: 'pending' },
      ],
      { from: '2026-11-16', to: '2026-11-22' },
      today,
    );
    expect(result.done).toBe(1);
    expect(result.skipped).toBe(2);
    expect(result.due).toBe(3);
    expect(result.pending).toBe(2);
    expect(result.percent).toBe(33);
  });

  it('compta la sessió d’avui quan ja està feta', () => {
    const result = compliance(
      [
        { date: '2026-11-20', status: 'done' },
        { date: '2026-11-21', status: 'done' },
      ],
      { from: '2026-11-16', to: '2026-11-21' },
      today,
    );
    expect(result.due).toBe(2);
    expect(result.done).toBe(2);
    expect(result.percent).toBe(100);
    expect(adherence(result)).toBe('al_dia');
  });

  it('marca endarrerit quan hi ha salts a la setmana', () => {
    const result = compliance(
      [
        { date: '2026-11-18', status: 'done' },
        { date: '2026-11-20', status: 'pending' },
      ],
      { from: '2026-11-16', to: '2026-11-21' },
      today,
    );
    expect(result.percent).toBe(50);
    expect(adherence(result)).toBe('endarrerit');
  });

  it('agrupa el compliment per setmanes', () => {
    const weeks = weeklyCompliance(
      [
        { date: '2026-11-16', status: 'done' },
        { date: '2026-11-18', status: 'done' },
        { date: '2026-11-20', status: 'pending' },
      ],
      today,
      2,
    );
    expect(weeks).toHaveLength(2);
    expect(weeks[1].weekStart).toBe('2026-11-16');
    expect(weeks[1].done).toBe(2);
    expect(weeks[1].due).toBe(3);
    expect(weeks[1].percent).toBe(67);
    expect(weeks[0].due).toBe(0);
    expect(weeks[0].percent).toBe(0);
  });
});
