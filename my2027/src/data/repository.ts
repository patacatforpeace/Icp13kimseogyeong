import type { AppState } from './types';
import type { StorageAdapter } from './storage/adapter';
import { localAdapter, readLocalSync } from './storage/localAdapter';
import { createArtifactDbAdapter } from './storage/artifactDbAdapter';
import { normalizeState } from './normalize';
import { createSeedState } from './seed';

export type CloudStatus = 'off' | 'connecting' | 'synced' | 'saving' | 'error';
export type LocalStatus = 'saved' | 'error' | 'unavailable';

export interface SyncInfo {
  local: LocalStatus;
  cloud: CloudStatus;
  cloudName?: string;
  lastSavedAt?: number;
  error?: string;
}

/** First state to paint: whatever is in this browser, or the seed. */
export function initialState(): AppState {
  const raw = readLocalSync();
  if (raw) {
    try {
      return normalizeState(raw);
    } catch {
      /* fall through to seed */
    }
  }
  return createSeedState();
}

/**
 * Keeps the browser copy and (when available) the cloud copy up to date.
 * localStorage is written immediately on every change; the cloud is written
 * after a short pause, one save at a time.
 */
export class Repository {
  private cloud: StorageAdapter | null = null;
  private pending: AppState | null = null;
  private saving = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  info: SyncInfo = { local: localAdapter.available() ? 'saved' : 'unavailable', cloud: 'connecting' };

  constructor(private onInfo: (i: SyncInfo) => void) {}

  private emit(patch: Partial<SyncInfo>) {
    this.info = { ...this.info, ...patch };
    this.onInfo(this.info);
  }

  /** Connect the cloud store. Resolves a newer remote state, if there is one. */
  async connect(local: AppState): Promise<AppState | null> {
    let adapter: StorageAdapter | null = null;
    try {
      adapter = await createArtifactDbAdapter();
    } catch {
      adapter = null;
    }
    if (!adapter) {
      this.emit({ cloud: 'off' });
      return null;
    }
    this.cloud = adapter;
    this.emit({ cloudName: adapter.name });
    try {
      const remote = await adapter.load();
      if (remote) {
        const norm = normalizeState(remote);
        if (norm.updatedAt > local.updatedAt) {
          this.emit({ cloud: 'synced', lastSavedAt: norm.updatedAt });
          this.writeLocal(norm);
          return norm;
        }
      }
      this.queueCloud(local, 0);
      return null;
    } catch (e) {
      this.emit({ cloud: 'error', error: (e as Error)?.message ?? String(e) });
      return null;
    }
  }

  private writeLocal(state: AppState) {
    if (this.info.local === 'unavailable') return;
    localAdapter
      .save(state)
      .then(() => this.emit({ local: 'saved', lastSavedAt: state.updatedAt }))
      .catch((e) => this.emit({ local: 'error', error: (e as Error).message }));
  }

  save(state: AppState) {
    this.writeLocal(state);
    if (this.cloud) this.queueCloud(state, 1200);
  }

  private queueCloud(state: AppState, delay: number) {
    this.pending = state;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), delay);
  }

  private async flush() {
    if (this.saving || !this.cloud || !this.pending) return;
    const state = this.pending;
    this.pending = null;
    this.saving = true;
    this.emit({ cloud: 'saving' });
    try {
      await this.cloud.save(state);
      this.emit({ cloud: 'synced', lastSavedAt: state.updatedAt, error: undefined });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      const msg = code === 'quota_exceeded' ? '클라우드 저장 공간이 가득 찼습니다. JSON 백업 후 오래된 기록을 정리해 주세요.' : (e as Error)?.message ?? String(e);
      this.emit({ cloud: 'error', error: msg });
    } finally {
      this.saving = false;
      if (this.pending) void this.flush();
    }
  }

  async clearAll() {
    clearTimeout(this.timer);
    this.pending = null;
    await localAdapter.clear();
    if (this.cloud) await this.cloud.clear().catch(() => undefined);
  }
}
