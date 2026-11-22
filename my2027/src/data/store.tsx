import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState } from './types';
import { Repository, initialState, type SyncInfo } from './repository';
import { createSeedState } from './seed';
import { todayISO } from '@/lib/date';

interface StoreValue {
  state: AppState;
  /** Apply a mutation to a deep copy of the state, then persist it. */
  update: (recipe: (draft: AppState) => void) => void;
  replaceAll: (next: AppState) => void;
  resetAll: () => Promise<void>;
  sync: SyncInfo;
  today: string;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [sync, setSync] = useState<SyncInfo>({ local: 'saved', cloud: 'connecting' });
  const [today, setToday] = useState(todayISO());
  const repoRef = useRef<Repository | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  if (!repoRef.current) repoRef.current = new Repository(setSync);

  useEffect(() => {
    const repo = repoRef.current!;
    setSync(repo.info);
    // First run: make sure the seed is persisted locally, then try the cloud.
    repo.save(stateRef.current);
    let alive = true;
    repo.connect(stateRef.current).then((remote) => {
      if (alive && remote) setState(remote);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Roll the date over at midnight (Asia/Seoul).
  useEffect(() => {
    const t = setInterval(() => setToday(todayISO()), 30_000);
    return () => clearInterval(t);
  }, []);

  const commit = useCallback((next: AppState) => {
    setState(next);
    repoRef.current!.save(next);
  }, []);

  const update = useCallback(
    (recipe: (draft: AppState) => void) => {
      const draft = structuredClone(stateRef.current);
      recipe(draft);
      draft.updatedAt = Date.now();
      stateRef.current = draft;
      commit(draft);
    },
    [commit],
  );

  const replaceAll = useCallback(
    (next: AppState) => {
      const s = { ...next, updatedAt: Date.now() };
      stateRef.current = s;
      commit(s);
    },
    [commit],
  );

  const resetAll = useCallback(async () => {
    await repoRef.current!.clearAll();
    const fresh = createSeedState();
    stateRef.current = fresh;
    commit(fresh);
  }, [commit]);

  const value = useMemo(() => ({ state, update, replaceAll, resetAll, sync, today }), [state, update, replaceAll, resetAll, sync, today]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
