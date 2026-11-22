import { describe, expect, it } from 'vitest';
import { doorFor } from './entry';

describe('portes de client i entrenador', () => {
  it('cada adreça només entra el seu rol', () => {
    expect(doorFor('client', null)).toBe('login');
    expect(doorFor('client', 'client')).toBe('enter');
    expect(doorFor('client', 'trainer')).toBe('wrong');
    expect(doorFor('trainer', null)).toBe('login');
    expect(doorFor('trainer', 'trainer')).toBe('enter');
    expect(doorFor('trainer', 'client')).toBe('wrong');
    expect(doorFor('trainer', 'admin')).toBe('enter');
    expect(doorFor('client', 'admin')).toBe('wrong');
  });
});
