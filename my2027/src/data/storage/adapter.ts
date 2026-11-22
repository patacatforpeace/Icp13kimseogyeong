import type { AppState } from '../types';

/**
 * A place where the app state can live. The UI never talks to an adapter directly:
 * it goes through the repository (see repository.ts). To move to a cloud database
 * such as Supabase later, implement this interface and register it in repository.ts.
 */
export interface StorageAdapter {
  readonly name: string;
  /** Resolve null when nothing has been saved yet. */
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
  clear(): Promise<void>;
}
