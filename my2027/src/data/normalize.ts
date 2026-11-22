import { createSeedState } from './seed';
import { SLICE_KEYS, type AppState } from './types';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Turn anything loaded from storage or an imported backup into a complete AppState.
 * Missing slices or fields fall back to the defaults, so older backups keep working.
 * Throws with a readable message when the input is clearly not a MY 2027 backup.
 */
export function normalizeState(raw: unknown): AppState {
  const src = isObj(raw) && isObj(raw.state) ? raw.state : raw; // accept the export envelope too
  if (!isObj(src)) throw new Error('JSON 최상위가 객체가 아닙니다.');
  const known = SLICE_KEYS.filter((k) => k in src);
  if (known.length < 3) throw new Error('MY 2027 백업 파일이 아닌 것 같습니다.');

  const base = createSeedState() as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = { version: 1, updatedAt: Number(src.updatedAt) || Date.now() };
  for (const key of SLICE_KEYS) {
    const def = base[key];
    const val = src[key];
    if (val === undefined) out[key] = def;
    else if (Array.isArray(def)) {
      if (!Array.isArray(val)) throw new Error(`'${key}' 항목의 형식이 올바르지 않습니다.`);
      out[key] = val;
    } else if (isObj(def)) {
      if (!isObj(val)) throw new Error(`'${key}' 항목의 형식이 올바르지 않습니다.`);
      out[key] = mergeObj(def, val);
    } else out[key] = val;
  }
  return out as unknown as AppState;
}

function mergeObj(def: Record<string, unknown>, val: Record<string, unknown>): Record<string, unknown> {
  const res: Record<string, unknown> = { ...def, ...val };
  for (const k of Object.keys(def)) {
    if (isObj(def[k]) && isObj(val[k]) && Object.keys(def[k] as object).length) {
      res[k] = mergeObj(def[k] as Record<string, unknown>, val[k] as Record<string, unknown>);
    } else if (Array.isArray(def[k]) && !Array.isArray(val[k])) res[k] = def[k];
  }
  return res;
}

export function exportEnvelope(state: AppState) {
  return { app: 'MY 2027', format: 1, exportedAt: new Date().toISOString(), state };
}
