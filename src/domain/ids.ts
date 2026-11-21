export function createId(prefix: string): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}${rand}`;
}

export type IdFactory = {
  plan: () => string;
  day: () => string;
  item: () => string;
  session: () => string;
  sessionItem: () => string;
  log: () => string;
  exerciseLog: () => string;
};

export function createIdFactory(): IdFactory {
  return {
    plan: () => createId('plan'),
    day: () => createId('day'),
    item: () => createId('item'),
    session: () => createId('ses'),
    sessionItem: () => createId('sei'),
    log: () => createId('log'),
    exerciseLog: () => createId('elog'),
  };
}

export function sequentialIds(seed = 'id'): IdFactory {
  const counts: Record<string, number> = {};
  const next = (prefix: string) => {
    counts[prefix] = (counts[prefix] ?? 0) + 1;
    return `${seed}_${prefix}_${String(counts[prefix]).padStart(3, '0')}`;
  };
  return {
    plan: () => next('plan'),
    day: () => next('day'),
    item: () => next('item'),
    session: () => next('ses'),
    sessionItem: () => next('sei'),
    log: () => next('log'),
    exerciseLog: () => next('elog'),
  };
}
