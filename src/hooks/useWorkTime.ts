import { useState, useEffect, useCallback } from "react";
import {
  type Countdown,
  type SlotCountdown,
  type WorkSchedule,
  type WorkPhase,
  DEFAULT_SCHEDULE,
  loadSchedule,
  saveSchedule,
  getElapsedWorkMinutes,
  getCurrentPhase,
  getCountdown,
  getSlotCountdown,
} from "../utils/timeUtils";

export interface WorkTimeState {
  schedule: WorkSchedule;
  /** False until the user saves a schedule for the first time */
  isConfigured: boolean;
  elapsedMinutes: number;
  phase: WorkPhase;
  countdown: Countdown | null;
  /** Time left in the current slot (before work, morning, lunch, afternoon) */
  slotCountdown: SlotCountdown | null;
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
    slotCountdown: getSlotCountdown(now, schedule),
    currentSeconds: now.getSeconds(),
    updateSchedule,
  };
}
