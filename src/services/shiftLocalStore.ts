import { ShiftState } from '../types';

const BASE_KEY = 'finandrive_shift_state_v1';

type StoredShiftState = {
  shiftState: ShiftState;
  savedAtMs: number;
};

export function getShiftStorageKey(userId?: string | null) {
  return `${BASE_KEY}:${userId ?? 'anon'}`;
}

const toNumberOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const normalizeShiftState = (raw: any): ShiftState | null => {
  if (!raw || typeof raw !== 'object') return null;

  const isActive = Boolean(raw.isActive);
  const isPaused = Boolean(raw.isPaused);

  const startTime = toNumberOrNull(raw.startTime);
  const startTimeMs = toNumberOrNull(raw.startTimeMs) ?? startTime;
  const pausedAtMs = toNumberOrNull(raw.pausedAtMs);
  const totalPausedMs = toNumberOrNull(raw.totalPausedMs) ?? 0;

  if (startTimeMs === null && (isActive || isPaused)) {
    // Sem tempo de início: não dá pra reconstruir cronômetro.
    return null;
  }

  const earnings = raw.earnings && typeof raw.earnings === 'object'
    ? {
      uber: Number(raw.earnings.uber ?? 0) || 0,
      n99: Number(raw.earnings.n99 ?? 0) || 0,
      indrive: Number(raw.earnings.indrive ?? 0) || 0,
      private: Number(raw.earnings.private ?? 0) || 0,
    }
    : { uber: 0, n99: 0, indrive: 0, private: 0 };

  const normalized: ShiftState = {
    isActive,
    isPaused,
    startTime: startTimeMs,
    startTimeMs,
    pausedAtMs: pausedAtMs ?? null,
    totalPausedMs: totalPausedMs ?? 0,
    elapsedSeconds: Number(raw.elapsedSeconds ?? 0) || 0,
    earnings,
    expenses: Number(raw.expenses ?? 0) || 0,
    expenseList: Array.isArray(raw.expenseList) ? raw.expenseList : [],
    km: Number(raw.km ?? 0) || 0,
  };

  return normalized;
};

export function saveShiftStateLocal(shiftState: ShiftState, userId?: string | null) {
  try {
    const key = getShiftStorageKey(userId);
    const payload: StoredShiftState = {
      shiftState,
      savedAtMs: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function loadShiftStateLocal(userId?: string | null): StoredShiftState | null {
  try {
    const key = getShiftStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const shift = normalizeShiftState(parsed.shiftState);
    if (!shift) return null;
    const savedAtMs = toNumberOrNull(parsed.savedAtMs) ?? 0;
    return { shiftState: shift, savedAtMs };
  } catch {
    return null;
  }
}

export function clearShiftStateLocal(userId?: string | null) {
  try {
    localStorage.removeItem(getShiftStorageKey(userId));
  } catch {
    // ignore
  }
}
