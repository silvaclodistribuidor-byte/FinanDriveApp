import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShiftState } from '../types';

const clampInt = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);

export const computeElapsedMs = (shift: ShiftState, nowMs: number = Date.now()) => {
  if (!shift.isActive) return 0;

  const start = (shift.startTimeMs ?? shift.startTime);
  if (start === null || start === undefined || !Number.isFinite(start)) return 0;

  const totalPaused = Number(shift.totalPausedMs ?? 0) || 0;

  const pausedAt = shift.pausedAtMs;
  const pausedSegment =
    shift.isPaused && pausedAt !== null && pausedAt !== undefined && Number.isFinite(pausedAt)
      ? Math.max(0, nowMs - pausedAt)
      : 0;

  const elapsed = nowMs - start - totalPaused - pausedSegment;
  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
};

export const computeElapsedMinutes = (shift: ShiftState, nowMs: number = Date.now()) => {
  return clampInt(computeElapsedMs(shift, nowMs) / 60000);
};

type UseShiftTimerResult = {
  displayedMinutes: number;
  startShift: () => void;
  togglePause: () => void;
  stopShift: () => void;
  editStartTime: (newStartMs: number) => void;
  reconcile: () => void;
};

export function useShiftTimer(
  shiftState: ShiftState,
  setShiftState: React.Dispatch<React.SetStateAction<ShiftState>>,
  persist?: (next: ShiftState) => void,
): UseShiftTimerResult {
  const [displayedMinutes, setDisplayedMinutes] = useState<number>(() => computeElapsedMinutes(shiftState));
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reconcile = useCallback(() => {
    setDisplayedMinutes(computeElapsedMinutes(shiftState));
  }, [shiftState]);

  const scheduleTicks = useCallback(() => {
    clearTimers();

    const hasStart = (shiftState.startTimeMs ?? shiftState.startTime);
    if (!shiftState.isActive || shiftState.isPaused || hasStart === null || hasStart === undefined || !Number.isFinite(hasStart)) {
      setDisplayedMinutes(computeElapsedMinutes(shiftState));
      return;
    }

    const alignAndStart = () => {
      setDisplayedMinutes(computeElapsedMinutes(shiftState));
      intervalRef.current = window.setInterval(() => {
        setDisplayedMinutes(computeElapsedMinutes(shiftState));
      }, 60000);
    };

    const now = Date.now();
    const elapsedMs = computeElapsedMs(shiftState, now);
    setDisplayedMinutes(clampInt(elapsedMs / 60000));

    // Alinha o tick no "virar do minuto" do cronômetro (não no relógio real), evitando drift.
    const rem = elapsedMs % 60000;
    const msToNextMinute = rem === 0 ? 60000 : 60000 - rem;

    timeoutRef.current = window.setTimeout(() => {
      alignAndStart();
    }, msToNextMinute);
  }, [clearTimers, shiftState]);

  useEffect(() => {
    scheduleTicks();
    return () => clearTimers();
  }, [scheduleTicks, clearTimers]);

  useEffect(() => {
    const onFocus = () => reconcile();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') reconcile();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reconcile]);

  const startShift = useCallback(() => {
    const now = Date.now();
    const next: ShiftState = {
      isActive: true,
      isPaused: false,
      startTime: now,
      startTimeMs: now,
      pausedAtMs: null,
      totalPausedMs: 0,
      elapsedSeconds: 0,
      earnings: { uber: 0, n99: 0, indrive: 0, private: 0 },
      expenses: 0,
      expenseList: [],
      km: 0,
    };

    setDisplayedMinutes(0);
    persist?.(next);
    setShiftState(() => next);
  }, [persist, setShiftState]);

  const pauseShift = useCallback(() => {
    setShiftState((prev) => {
      if (!prev.isActive || prev.isPaused) return prev;
      const now = Date.now();
      const start = (prev.startTimeMs ?? prev.startTime ?? now);
      const updatedBase: ShiftState = {
        ...prev,
        isPaused: true,
        pausedAtMs: now,
        startTimeMs: start,
        startTime: start,
      };
      const minutes = computeElapsedMinutes(updatedBase, now);
      const updated: ShiftState = { ...updatedBase, elapsedSeconds: minutes * 60 };
      setDisplayedMinutes(minutes);
      persist?.(updated);
      return updated;
    });
  }, [persist, setShiftState]);

  const resumeShift = useCallback(() => {
    setShiftState((prev) => {
      if (!prev.isActive || !prev.isPaused) return prev;
      const now = Date.now();
      const start = (prev.startTimeMs ?? prev.startTime ?? now);
      const pausedAt = (prev.pausedAtMs ?? now);
      const deltaPaused = Math.max(0, now - pausedAt);
      const totalPaused = (Number(prev.totalPausedMs ?? 0) || 0) + deltaPaused;

      const updatedBase: ShiftState = {
        ...prev,
        isPaused: false,
        pausedAtMs: null,
        totalPausedMs: totalPaused,
        startTimeMs: start,
        startTime: start,
      };
      const minutes = computeElapsedMinutes(updatedBase, now);
      const updated: ShiftState = { ...updatedBase, elapsedSeconds: minutes * 60 };
      setDisplayedMinutes(minutes);
      persist?.(updated);
      return updated;
    });
  }, [persist, setShiftState]);

  const stopShift = useCallback(() => {
    clearTimers();
    setShiftState((prev) => {
      if (!prev.isActive) return prev;
      const now = Date.now();
      const start = (prev.startTimeMs ?? prev.startTime ?? now);
      const normalized: ShiftState = {
        ...prev,
        startTimeMs: start,
        startTime: start,
      };
      const minutes = computeElapsedMinutes(normalized, now);
      const updated: ShiftState = {
        ...normalized,
        // Mantemos isActive=true para não quebrar a lógica atual do app,
        // mas travamos o cronômetro como "pausado".
        isPaused: true,
        pausedAtMs: now,
        elapsedSeconds: minutes * 60,
      };
      setDisplayedMinutes(minutes);
      persist?.(updated);
      return updated;
    });
  }, [clearTimers, persist, setShiftState]);

  const togglePause = useCallback(() => {
    if (!shiftState.isActive) return;
    if (shiftState.isPaused) resumeShift();
    else pauseShift();
  }, [pauseShift, resumeShift, shiftState.isActive, shiftState.isPaused]);

  const editStartTime = useCallback((newStartMs: number) => {
    setShiftState((prev) => {
      if (!prev.isActive) return prev;
      const now = Date.now();
      const nextStart = Number.isFinite(newStartMs) ? newStartMs : now;

      const updatedBase: ShiftState = {
        ...prev,
        startTimeMs: nextStart,
        startTime: nextStart,
        pausedAtMs: prev.isPaused ? (prev.pausedAtMs ?? now) : null,
        totalPausedMs: Number(prev.totalPausedMs ?? 0) || 0,
      };
      const minutes = computeElapsedMinutes(updatedBase, now);
      const updated: ShiftState = { ...updatedBase, elapsedSeconds: minutes * 60 };
      setDisplayedMinutes(minutes);
      persist?.(updated);
      return updated;
    });
  }, [persist, setShiftState]);

  return useMemo(() => ({
    displayedMinutes,
    startShift,
    togglePause,
    stopShift,
    editStartTime,
    reconcile,
  }), [displayedMinutes, startShift, togglePause, stopShift, editStartTime, reconcile]);
}
