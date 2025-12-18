import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShiftState } from '../types';

export const computeElapsedMs = (shift: ShiftState, nowMs: number = Date.now()) => {
  if (!shift.isActive || (!shift.startTimeMs && !shift.startTime)) return 0;
  const start = shift.startTimeMs ?? shift.startTime ?? nowMs;
  const totalPaused = shift.totalPausedMs ?? 0;
  const pausedSegment = shift.isPaused && shift.pausedAtMs ? Math.max(0, nowMs - shift.pausedAtMs) : 0;
  return Math.max(0, nowMs - start - totalPaused - pausedSegment);
};

export const computeElapsedMinutes = (shift: ShiftState, nowMs: number = Date.now()) => {
  const elapsedMs = computeElapsedMs(shift, nowMs);
  return Math.floor(elapsedMs / 60000);
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
    if (!shiftState.isActive || shiftState.isPaused || !(shiftState.startTimeMs || shiftState.startTime)) return;

    const alignAndStart = () => {
      const refreshedMinutes = computeElapsedMinutes(shiftState);
      setDisplayedMinutes(refreshedMinutes);
      intervalRef.current = window.setInterval(() => {
        setDisplayedMinutes(computeElapsedMinutes(shiftState));
      }, 60000);
    };

    const now = Date.now();
    const elapsedMs = computeElapsedMs(shiftState, now);
    setDisplayedMinutes(Math.floor(elapsedMs / 60000));
    const msToNextMinute = 60000 - (elapsedMs % 60000 || 60000);

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
    setDisplayedMinutes(0);
    setShiftState(() => ({
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
    }));
  }, [setShiftState]);

  const pauseShift = useCallback(() => {
    setShiftState((prev) => {
      if (!prev.isActive || prev.isPaused) return prev;
      const now = Date.now();
      const updated: ShiftState = {
        ...prev,
        isPaused: true,
        pausedAtMs: now,
        startTimeMs: prev.startTimeMs ?? prev.startTime ?? now,
      };
      const minutes = computeElapsedMinutes(updated, now);
      setDisplayedMinutes(minutes);
      return { ...updated, elapsedSeconds: minutes * 60 };
    });
  }, [setShiftState]);

  const resumeShift = useCallback(() => {
    setShiftState((prev) => {
      if (!prev.isActive || !prev.isPaused) return prev;
      const now = Date.now();
      const pausedAt = prev.pausedAtMs ?? now;
      const totalPaused = (prev.totalPausedMs ?? 0) + Math.max(0, now - pausedAt);
      const updated: ShiftState = {
        ...prev,
        isPaused: false,
        pausedAtMs: null,
        totalPausedMs: totalPaused,
        startTimeMs: prev.startTimeMs ?? prev.startTime ?? now,
      };
      const minutes = computeElapsedMinutes(updated, now);
      setDisplayedMinutes(minutes);
      return { ...updated, elapsedSeconds: minutes * 60 };
    });
  }, [setShiftState]);

  const stopShift = useCallback(() => {
    clearTimers();
    setShiftState((prev) => {
      if (!prev.isActive) return prev;
      const now = Date.now();
      const normalized: ShiftState = {
        ...prev,
        startTimeMs: prev.startTimeMs ?? prev.startTime ?? now,
        startTime: prev.startTimeMs ?? prev.startTime ?? now,
      };
      const minutes = computeElapsedMinutes(normalized, now);
      setDisplayedMinutes(minutes);
      return {
        ...normalized,
        isPaused: true,
        pausedAtMs: now,
        elapsedSeconds: minutes * 60,
      };
    });
  }, [clearTimers, setShiftState]);

  const togglePause = useCallback(() => {
    if (!shiftState.isActive) return;
    if (shiftState.isPaused) {
      resumeShift();
    } else {
      pauseShift();
    }
  }, [pauseShift, resumeShift, shiftState.isActive, shiftState.isPaused]);

  const editStartTime = useCallback((newStartMs: number) => {
    setShiftState((prev) => {
      if (!prev.isActive) return prev;
      const now = Date.now();
      const updated: ShiftState = {
        ...prev,
        startTimeMs: newStartMs,
        startTime: newStartMs,
        pausedAtMs: prev.isPaused ? prev.pausedAtMs : null,
        totalPausedMs: prev.totalPausedMs ?? 0,
      };
      const minutes = computeElapsedMinutes(updated, now);
      setDisplayedMinutes(minutes);
      return { ...updated, elapsedSeconds: minutes * 60 };
    });
  }, [setShiftState]);

  return useMemo(() => ({
    displayedMinutes,
    startShift,
    togglePause,
    stopShift,
    editStartTime,
    reconcile,
  }), [displayedMinutes, startShift, togglePause, stopShift, editStartTime, reconcile]);
}
