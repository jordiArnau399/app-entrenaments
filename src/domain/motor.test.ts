import { describe, expect, it } from 'vitest';
import { todayIso } from './dates';
import { resolveLanguage, translate } from './i18n';
import { signupOutcome } from './signup';

describe('motor', () => {
  it('sense codi no neix un entrenador, i el correu administrador sí', () => {
    expect(signupOutcome({ email: 'oriol@exemple.cat', inviteKind: null })).toBe('rejected');
    expect(signupOutcome({ email: 'adria@exemple.cat', inviteKind: 'trainer' })).toBe('trainer');
    expect(signupOutcome({ email: 'carina@exemple.cat', inviteKind: 'client' })).toBe('client');
    expect(signupOutcome({ email: 'JordiArnau@gmail.com', inviteKind: null })).toBe('admin');
  });

  it('el dia civil segueix el fus del client', () => {
    const instant = new Date('2026-11-22T00:30:00.000Z');
    expect(todayIso(instant, 'Europe/Madrid')).toBe('2026-11-22');
    expect(todayIso(instant, 'Australia/Sydney')).toBe('2026-11-22');
    const late = new Date('2026-11-21T14:30:00.000Z');
    expect(todayIso(late, 'Europe/Madrid')).toBe('2026-11-21');
    expect(todayIso(late, 'Australia/Sydney')).toBe('2026-11-22');
  });

  it('la llengua surt del perfil o de l’aparell, i els textos es tradueixen', () => {
    expect(resolveLanguage('en', 'ca')).toBe('en');
    expect(resolveLanguage(null, 'es')).toBe('es');
    expect(translate('en', 'Avui')).toBe('Today');
    expect(translate('es', 'Plantilles')).toBe('Plantillas');
    expect(translate('ca', 'Avui')).toBe('Avui');
    expect(translate('en', 'Text sense fitxa')).toBe('Text sense fitxa');
  });
});