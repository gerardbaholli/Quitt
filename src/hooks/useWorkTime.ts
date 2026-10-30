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
  now: Date;
  schedule: WorkSchedule;
  /** False until the user saves a schedule for the first time */
  isConfigured: boolean;
  elapsedMinutes: number;
  phase: WorkPhase;
  countdown: Countdown | null;
  /** Time left in the current slot (before work, morning, lunch, afternoon) */
  slotCountdown: SlotCountdown | null;
  updateSchedule: (schedule: WorkSchedule) => void;
}

// Dev only: ?at=2026-10-27T11:27:42 simulates the clock for visual checks (stripped from production builds)
const CLOCK_OFFSET = import.meta.env.DEV ? simulatedOffset() : 0;

function simulatedOffset(): number {
  const at = new URLSearchParams(location.search).get("at");
  const time = at ? new Date(at).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time - Date.now();
}

const clock = () => new Date(Date.now() + CLOCK_OFFSET);

export function useWorkTime(): WorkTimeState {
  const [saved, setSaved] = useState(loadSchedule);
  const [now, setNow] = useState(clock);
  const schedule = saved ?? DEFAULT_SCHEDULE;

  useEffect(() => {
    const interval = setInterval(() => setNow(clock()), 1000);
    return () => clearInterval(interval);
  }, []);

  const updateSchedule = useCallback((newSchedule: WorkSchedule) => {
    setSaved(newSchedule);
    saveSchedule(newSchedule);
  }, []);

  return {
    now,
    schedule,
    isConfigured: saved !== null,
    elapsedMinutes: getElapsedWorkMinutes(now, schedule),
    phase: getCurrentPhase(now, schedule),
    countdown: getCountdown(now, schedule),
    slotCountdown: getSlotCountdown(now, schedule),
    updateSchedule,
  };
}
