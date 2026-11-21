import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { openAppRepository } from '../data/openApp';
import type { Repository } from '../data/repository';
import { pendingOps } from '../domain/sync';
import type { ExerciseType, SessionFeeling, Snapshot, Template } from '../domain/types';
import type { LogDraftExercise } from '../domain/sessionLog';
import { configureNotifications, scheduleDailyReminder } from '../sync/notifications';
import { signIn as authSignIn, signOutLocal, signUpClient, signUpTrainer, supabaseConfigured } from '../sync/auth';
import { pullCloud } from '../sync/cloud';
import { connectRemote, supabaseAccountRemote } from '../sync/remote';

type Hub = 'off' | 'connected' | 'unavailable';

type ExerciseInput = {
  id?: string;
  name: string;
  type: ExerciseType;
  category: string;
  description: string;
  imageUrl: string | null;
  videoUrl: string | null;
};

type AppApi = {
  ready: boolean;
  error: string | null;
  notice: string | null;
  snapshot: Snapshot | null;
  pending: number;
  hub: Hub;
  syncing: boolean;
  accounts: boolean;
  clearNotice: () => void;
  signIn: (email: string, password: string) => Promise<'trainer' | 'client' | undefined>;
  signUpAsTrainer: (name: string, email: string, password: string) => Promise<'trainer' | 'client' | undefined>;
  signUpAsClient: (name: string, email: string, password: string, code: string) => Promise<'trainer' | 'client' | undefined>;
  signOutAccount: () => Promise<void>;
  enterTrainer: () => Promise<void>;
  enterClient: (clientId: string) => Promise<void>;
  leave: () => Promise<void>;
  setOffline: (value: boolean) => Promise<void>;
  setReminder: (time: string) => Promise<string>;
  syncNow: () => Promise<void>;
  resetDemo: () => Promise<void>;
  addClient: (name: string, email: string) => Promise<void>;
  saveExercise: (input: ExerciseInput) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  saveTemplate: (draft: Template) => Promise<string | undefined>;
  assign: (input: { templateId: string; clientId: string; startDate: string; weeks: number }) => Promise<string | undefined>;
  updatePlanExercise: (
    planId: string,
    itemId: string,
    patch: { strength?: { sets: number; reps: number; weightKg: number } | null; cardio?: { durationSec: number; distanceM: number; paceSecPerKm: number | null } | null; notes?: string },
  ) => Promise<void>;
  addExerciseToPlan: (planId: string, dayId: string, exerciseId: string) => Promise<void>;
  removeExerciseFromPlan: (planId: string, itemId: string) => Promise<void>;
  logSession: (input: { sessionId: string; exercises: LogDraftExercise[]; feeling: SessionFeeling; rpe: number; notes: string }) => Promise<boolean>;
  skipSession: (sessionId: string) => Promise<void>;
};

const AppContext = createContext<AppApi | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const repoRef = useRef<Repository | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [pending, setPending] = useState(0);
  const [hub, setHub] = useState<Hub>('off');
  const [syncing, setSyncing] = useState(false);

  const apply = useCallback(() => {
    const repo = repoRef.current;
    if (!repo) return;
    setSnapshot(repo.snapshot);
    setPending(pendingOps(repo.queue).length);
  }, []);

  const syncNow = useCallback(async () => {
    const repo = repoRef.current;
    if (!repo || repo.snapshot.settings.offline) {
      apply();
      return;
    }
    setSyncing(true);
    try {
      if (!repo.remote) repo.remote = await connectRemote();
      const result = await repo.flush();
      setHub(!repo.remote ? 'off' : result === 'error' ? 'unavailable' : 'connected');
      apply();
    } finally {
      setSyncing(false);
    }
  }, [apply]);

  useEffect(() => {
    let alive = true;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Ritme · Entrenaments';
      const styleId = 'ritme-base';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = 'html, body, #root { height: 100%; background: #F3EEE6; } body { margin: 0; }';
        document.head.appendChild(style);
      }
      const fontId = 'ritme-fonts';
      if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,600&family=Outfit:wght@400;500;600&display=swap';
        document.head.appendChild(link);
      }
    }
    configureNotifications().catch(() => undefined);
    (async () => {
      try {
        const repo = await openAppRepository();
        if (!alive) return;
        repoRef.current = repo;
        apply();
        setHub(repo.remote ? 'connected' : 'off');
        setReady(true);
        if (!repo.snapshot.settings.offline) {
          const result = await repo.flush();
          if (!alive) return;
          setHub(!repo.remote ? 'off' : result === 'error' ? 'unavailable' : 'connected');
          apply();
        }
      } catch (cause) {
        if (!alive) return;
        setError(cause instanceof Error ? cause.message : 'No s’ha pogut obrir Ritme');
      }
    })();
    const timer = setInterval(() => {
      syncNow().catch(() => undefined);
    }, 12000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [apply, syncNow]);

  useEffect(() => {
    const refresh = () => {
      syncNow().catch(() => undefined);
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') refresh();
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      sub.remove();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [syncNow]);

  const enterAccount = useCallback(
    async (start: () => Promise<{ userId: string }>): Promise<'trainer' | 'client' | undefined> => {
      const repo = repoRef.current;
      if (!repo) return undefined;
      try {
        const session = await start();
        repo.remote = supabaseAccountRemote();
        await repo.adoptAccount(await pullCloud(), session.userId);
        setNotice(null);
        setHub('connected');
        apply();
        const role = repo.snapshot.settings.role;
        if (role !== 'trainer' && role !== 'client') throw new Error('Aquest compte no té perfil');
        return role;
      } catch (cause) {
        setNotice(cause instanceof Error ? cause.message : 'No s\'ha pogut entrar');
        apply();
        return undefined;
      }
    },
    [apply],
  );

  const run = useCallback(
    async <T,>(work: (repo: Repository) => Promise<T>): Promise<T | undefined> => {
      const repo = repoRef.current;
      if (!repo) return undefined;
      try {
        const result = await work(repo);
        setNotice(null);
        apply();
        setHub(repo.remote ? 'connected' : 'off');
        return result;
      } catch (cause) {
        setNotice(cause instanceof Error ? cause.message : 'Alguna cosa ha fallat');
        apply();
        return undefined;
      }
    },
    [apply],
  );

  const api = useMemo<AppApi>(
    () => ({
      ready,
      error,
      notice,
      snapshot,
      pending,
      hub,
      syncing,
      accounts: supabaseConfigured(),
      clearNotice: () => setNotice(null),
      signIn: (email, password) => enterAccount(() => authSignIn(email, password)),
      signUpAsTrainer: (name, email, password) => enterAccount(() => signUpTrainer(name, email, password)),
      signUpAsClient: (name, email, password, code) => enterAccount(() => signUpClient(name, email, password, code)),
      signOutAccount: async () => {
        signOutLocal();
        await run((repo) => repo.signOutAccount());
        setHub('off');
      },
      enterTrainer: () => run((repo) => repo.setProfile('trainer', null)).then(() => undefined),
      enterClient: (clientId) => run((repo) => repo.setProfile('client', clientId)).then(() => undefined),
      leave: () => run((repo) => repo.setProfile(null, null)).then(() => undefined),
      setOffline: (value) => run((repo) => repo.setOffline(value)).then(() => undefined),
      setReminder: async (time) => {
        await run((repo) => repo.setReminderTime(time));
        const scheduled = await scheduleDailyReminder(time);
        if (scheduled === 'unsupported') return 'El recordatori es programa al telèfon, amb Expo Go.';
        if (scheduled === 'denied') return 'Cal permetre les notificacions del telèfon.';
        return 'Recordatori diari programat.';
      },
      syncNow,
      resetDemo: () => run((repo) => repo.resetDemo()).then(() => undefined),
      addClient: async (name, email) => {
        const code = await run((repo) => repo.addClient(name, email));
        if (repoRef.current?.snapshot.settings.mode === 'account' && code) {
          setNotice(`Codi d'invitació: ${code}. El client l'escriu en registrar-se.`);
        }
      },
      saveExercise: (input) => run((repo) => repo.saveExercise(input)).then(() => undefined),
      deleteExercise: (id) => run((repo) => repo.deleteExercise(id)).then(() => undefined),
      saveTemplate: (draft) => run((repo) => repo.saveTemplate(draft)),
      assign: (input) => run((repo) => repo.assign(input)),
      updatePlanExercise: (planId, itemId, patch) => run((repo) => repo.updatePlanExercise(planId, itemId, patch)).then(() => undefined),
      addExerciseToPlan: (planId, dayId, exerciseId) =>
        run((repo) => repo.addExerciseToPlan(planId, dayId, exerciseId)).then(() => undefined),
      removeExerciseFromPlan: (planId, itemId) => run((repo) => repo.removeExerciseFromPlan(planId, itemId)).then(() => undefined),
      logSession: async (input) => Boolean(await run((repo) => repo.logSession(input))),
      skipSession: (sessionId) => run((repo) => repo.skipSession(sessionId)).then(() => undefined),
    }),
    [ready, error, notice, snapshot, pending, hub, syncing, run, syncNow, enterAccount],
  );

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}

export function useApp(): AppApi {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp fora del proveïdor');
  return value;
}

export function useSnapshot(): Snapshot {
  const { snapshot } = useApp();
  if (!snapshot) throw new Error('Les dades encara no estan a punt');
  return snapshot;
}
