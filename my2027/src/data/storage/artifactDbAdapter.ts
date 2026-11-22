import { SLICE_KEYS, type AppState, type SliceKey } from '../types';
import type { StorageAdapter } from './adapter';

/**
 * Cloud storage when the app runs as a claude.ai artifact: each viewer's data lives in
 * their own private subtree (data/users/<id>/...). Each top-level slice is stored as JSON
 * text split into ≤180 KB chunks (documents are capped at 256 KiB), and only slices whose
 * text changed are rewritten.
 */
type DocRef = {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
};
type DB = { collection(path: string): { doc(id: string): DocRef } };
type ClaudeRuntime = { use(name: string): Promise<unknown> };

const CHUNK = 180_000;

function runtime(): ClaudeRuntime | null {
  const c = (window as unknown as { claude?: ClaudeRuntime }).claude;
  return c && typeof c.use === 'function' ? c : null;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<null>((r) => (t = setTimeout(() => r(null), ms)));
  try {
    return await Promise.race([p, timer]);
  } finally {
    clearTimeout(t);
  }
}

async function retryOnce<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if ((e as { code?: string })?.code !== 'unavailable') throw e;
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 800));
    return fn();
  }
}

export async function createArtifactDbAdapter(): Promise<StorageAdapter | null> {
  const rt = runtime();
  if (!rt) return null;
  const [db, user] = (await withTimeout(Promise.all([rt.use('db'), rt.use('user')]), 10_000)) ?? [null, null];
  if (!db || !user) return null;
  const id = await withTimeout((user as { id(): Promise<string | null> }).id(), 10_000);
  if (!id) return null;
  const col = (db as DB).collection(`data/users/${id}`);

  const lastText: Partial<Record<SliceKey, string>> = {};
  const lastChunks: Partial<Record<SliceKey, number>> = {};

  return {
    name: 'claude.ai 클라우드',
    async load() {
      const meta = await retryOnce(() => col.doc('meta').get());
      if (!meta.exists) return null;
      const m = meta.data() as { updatedAt: number; chunks: Record<string, number> };
      const state: Record<string, unknown> = { version: 1, updatedAt: m.updatedAt };
      for (const key of SLICE_KEYS) {
        const n = m.chunks?.[key] ?? 0;
        if (!n) continue;
        const parts: string[] = [];
        for (let i = 0; i < n; i++) {
          const snap = await retryOnce(() => col.doc(`${key}.${i}`).get());
          parts.push(String(snap.data()?.text ?? ''));
        }
        const text = parts.join('');
        lastText[key] = text;
        lastChunks[key] = n;
        state[key] = JSON.parse(text);
      }
      return state as unknown as AppState;
    },
    async save(state) {
      const chunks: Record<string, number> = {};
      for (const key of SLICE_KEYS) {
        const text = JSON.stringify(state[key]);
        const n = Math.max(1, Math.ceil(text.length / CHUNK));
        chunks[key] = n;
        if (lastText[key] === text) continue;
        for (let i = 0; i < n; i++) {
          const part = text.slice(i * CHUNK, (i + 1) * CHUNK);
          await retryOnce(() => col.doc(`${key}.${i}`).set({ text: part }));
        }
        for (let i = n; i < (lastChunks[key] ?? 0); i++) {
          await retryOnce(() => col.doc(`${key}.${i}`).delete());
        }
        lastText[key] = text;
        lastChunks[key] = n;
      }
      await retryOnce(() => col.doc('meta').set({ updatedAt: state.updatedAt, chunks }));
    },
    async clear() {
      for (const key of SLICE_KEYS) {
        for (let i = 0; i < (lastChunks[key] ?? 1); i++) await col.doc(`${key}.${i}`).delete();
        delete lastText[key];
        delete lastChunks[key];
      }
      await col.doc('meta').delete();
    },
  };
}
