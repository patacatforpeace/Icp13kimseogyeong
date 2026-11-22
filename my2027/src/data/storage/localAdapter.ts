import type { AppState } from '../types';
import type { StorageAdapter } from './adapter';

export const LOCAL_KEY = 'my2027:state:v1';

function storage(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = '__my2027_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

/** Synchronous read used to paint the first frame without waiting. */
export function readLocalSync(): AppState | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as AppState) : null;
  } catch {
    return null;
  }
}

export const localAdapter: StorageAdapter & { available: () => boolean } = {
  name: 'localStorage',
  available: () => storage() !== null,
  async load() {
    return readLocalSync();
  },
  async save(state) {
    const s = storage();
    if (!s) throw new Error('이 브라우저에서는 로컬 저장소를 사용할 수 없습니다.');
    s.setItem(LOCAL_KEY, JSON.stringify(state));
  },
  async clear() {
    storage()?.removeItem(LOCAL_KEY);
  },
};
