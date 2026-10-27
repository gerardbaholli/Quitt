export interface WorkSchedule {
  start: string;
  lunchStart: string;
  lunchMinutes: number;
  end: string;
  /** Days off, as Date.getDay() values (0 = Sunday) */
  restDays: number[];
}

export type WorkPhase =
  | "day-off"
  | "before-work"
  | "morning"
  | "lunch-break"
  | "afternoon"
  | "after-work";

export interface Countdown {
  to: "lunch" | "end";
  seconds: number;
}

export const DEFAULT_SCHEDULE: WorkSchedule = {
  start: "09:00",
  lunchStart: "13:00",
  lunchMinutes: 60,
  end: "18:00",
  restDays: [0, 6],
};

const STORAGE_KEY = "timeleft-schedule";
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Convert "HH:MM" to minutes since midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Convert minutes since midnight to "HH:MM" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Format seconds as "H:MM:SS" */
export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Morning and afternoon work periods, in minutes since midnight */
export function getPeriods(schedule: WorkSchedule) {
  const lunchStart = timeToMinutes(schedule.lunchStart);
  return {
    morning: { start: timeToMinutes(schedule.start), end: lunchStart },
    afternoon: { start: lunchStart + schedule.lunchMinutes, end: timeToMinutes(schedule.end) },
  };
}

/** Valid times, start < lunch, lunch end < end, at least one working day */
export function isValidSchedule(value: unknown): value is WorkSchedule {
  const s = value as Partial<WorkSchedule> | null;
  if (![s?.start, s?.lunchStart, s?.end].every((t) => typeof t === "string" && TIME_RE.test(t))) return false;
  if (!Number.isInteger(s?.lunchMinutes) || s!.lunchMinutes! < 0) return false;
  const days = s!.restDays;
  if (!Array.isArray(days) || days.length >= 7 || !days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) return false;
  const { morning, afternoon } = getPeriods(s as WorkSchedule);
  return morning.start < morning.end && afternoon.start < afternoon.end;
}

/** Get current phase of the day */
export function getCurrentPhase(now: Date, schedule: WorkSchedule): WorkPhase {
  if (schedule.restDays.includes(now.getDay())) return "day-off";
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const { morning, afternoon } = getPeriods(schedule);

  if (currentMinutes < morning.start) return "before-work";
  if (currentMinutes < morning.end) return "morning";
  if (currentMinutes < afternoon.start) return "lunch-break";
  if (currentMinutes < afternoon.end) return "afternoon";
  return "after-work";
}

/** Get elapsed work minutes (only counting work time, not lunch) */
export function getElapsedWorkMinutes(now: Date, schedule: WorkSchedule): number {
  if (schedule.restDays.includes(now.getDay())) return 0;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const { morning, afternoon } = getPeriods(schedule);
  const morningDuration = morning.end - morning.start;

  if (currentMinutes <= morning.start) return 0;
  if (currentMinutes <= morning.end) return currentMinutes - morning.start;
  if (currentMinutes <= afternoon.start) return morningDuration;
  if (currentMinutes <= afternoon.end) return morningDuration + (currentMinutes - afternoon.start);
  return morningDuration + (afternoon.end - afternoon.start);
}

/** Clock time left until lunch (before it) or until end of day (from lunch on); null when nothing to count */
export function getCountdown(now: Date, schedule: WorkSchedule): Countdown | null {
  const phase = getCurrentPhase(now, schedule);
  if (phase === "day-off" || phase === "after-work") return null;
  const { morning, afternoon } = getPeriods(schedule);
  const to = phase === "before-work" || phase === "morning" ? "lunch" : "end";
  const target = (to === "lunch" ? morning.end : afternoon.end) * 60;
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  return { to, seconds: target - nowSeconds };
}

/** Convert the old { morning, afternoon } format saved by previous versions */
function migrate(value: unknown): unknown {
  const old = value as { morning?: { start: string; end: string }; afternoon?: { start: string; end: string } } | null;
  if (!old?.morning || !old.afternoon) return value;
  return {
    start: old.morning.start,
    lunchStart: old.morning.end,
    lunchMinutes: timeToMinutes(old.afternoon.start) - timeToMinutes(old.morning.end),
    end: old.afternoon.end,
    restDays: DEFAULT_SCHEDULE.restDays,
  };
}

/** Load schedule from localStorage; null if never configured or invalid */
export function loadSchedule(): WorkSchedule | null {
  try {
    const saved = migrate(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
    if (isValidSchedule(saved)) return saved;
  } catch {
    // ignore
  }
  return null;
}

/** Save schedule to localStorage */
export function saveSchedule(schedule: WorkSchedule): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
  } catch {
    // storage unavailable (private mode, quota): schedule stays in memory only
  }
}
