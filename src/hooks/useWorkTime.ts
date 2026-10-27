import { useState, useEffect, useCallback } from "react";
import {
  type Countdown,
  type WorkSchedule,
  type WorkPhase,
  DEFAULT_SCHEDULE,
  loadSchedule,
  saveSchedule,
  getElapsedWorkMinutes,
  getCurrentPhase,
  getCountdown,
} from "../utils/timeUtils";

export interface WorkTimeState {
  schedule: WorkSchedule;
  /** False until the user saves a schedule for the first time */
  isConfigured: boolean;
  elapsedMinutes: number;
  phase: WorkPhase;
  countdown: Countdown | null;
  currentSeconds: number;
  updateSchedule: (schedule: WorkSchedule) => void;
}

export function useWorkTime(): WorkTimeState {
  const [saved, setSaved] = useState(loadSchedule);
  const [now, setNow] = useState(() => new Date());
  const schedule = saved ?? DEFAULT_SCHEDULE;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const updateSchedule = useCallback((newSchedule: WorkSchedule) => {
    setSaved(newSchedule);
    saveSchedule(newSchedule);
  }, []);

  return {
    schedule,
    isConfigured: saved !== null,
    elapsedMinutes: getElapsedWorkMinutes(now, schedule),
    phase: getCurrentPhase(now, schedule),
    countdown: getCountdown(now, schedule),
    currentSeconds: now.getSeconds(),
    updateSchedule,
  };
}
