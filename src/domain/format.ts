import type { CardioTarget, SessionFeeling, StrengthTarget } from './types';

export const FEELING_LABEL: Record<SessionFeeling, string> = {
  molt_be: 'Molt bé',
  be: 'Bé',
  normal: 'Normal',
  dur: 'Dur',
  molt_dur: 'Molt dur',
};

export function formatKg(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} kg` : `${rounded.toFixed(1)} kg`;
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  if (rest === 0) return `${minutes} min`;
  return `${minutes} min ${rest} s`;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    const text = Number.isInteger(km) ? String(km) : km.toFixed(1);
    return `${text} km`;
  }
  return `${Math.round(meters)} m`;
}

export function formatPace(secPerKm: number | null): string {
  if (secPerKm == null || !Number.isFinite(secPerKm) || secPerKm <= 0) return '—';
  const total = Math.round(secPerKm);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`;
}

export function paceSecPerKm(durationSec: number, distanceM: number): number | null {
  if (durationSec <= 0 || distanceM <= 0) return null;
  return Math.round(durationSec / (distanceM / 1000));
}

export function formatStrength(target: StrengthTarget): string {
  return `${target.sets} × ${target.reps} · ${formatKg(target.weightKg)}`;
}

export function formatCardio(target: CardioTarget): string {
  const parts = [formatDuration(target.durationSec)];
  if (target.distanceM > 0) parts.push(formatDistance(target.distanceM));
  if (target.paceSecPerKm) parts.push(formatPace(target.paceSecPerKm));
  return parts.join(' · ');
}

export function rpeCaption(rpe: number): string {
  if (rpe <= 2) return 'Molt fàcil';
  if (rpe <= 4) return 'Fàcil';
  if (rpe <= 6) return 'Moderat';
  if (rpe <= 8) return 'Dur';
  return 'Màxim';
}
