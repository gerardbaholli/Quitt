export interface WorkSchedule {
  start: string;
  lunchStart: string;
  lunchMinutes: number;
  end: string;
  /** Working days, as Date.getDay() values (0 = Sunday) */
  workDays: number[];
}

export type WorkPhase =
  | "day-off"
  | "before-work"
  | "morning"
  | "lunch-break"
  | "afternoon"
  | "after-work";

export interface Countdown {
  to: "start" | "lunch" | "end";
  seconds: number;
}

export interface SlotCountdown {
  phase: WorkPhase;
  seconds: number;
}

/** Error message per settings field; a field is valid when its key is missing */
export type ScheduleErrors = Partial<Record<"start" | "lunchStart" | "lunchMinutes" | "end" | "workDays", string>>;

export const DEFAULT_SCHEDULE: WorkSchedule = {
  start: "09:00",
  lunchStart: "13:00",
  lunchMinutes: 60,
  end: "18:00",
  workDays: [1, 2, 3, 4, 5],
};

/** Monday-first week, as Date.getDay() values */
export const WEEK = [1, 2, 3, 4, 5, 6, 0];
const DAY_SHORT = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const DAY_LONG = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

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

/** Short form for tight spaces: "09" on the hour, "09:30" otherwise */
export function minutesToShortTime(minutes: number): string {
  return minutes % 60 === 0 ? minutesToTime(minutes).slice(0, 2) : minutesToTime(minutes);
}

/** Format seconds as "H:MM:SS" */
export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Format a duration in minutes: "4 h", "3 h 30 min", "45 min" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** "lun–ven · 5 giorni": runs of 3+ consecutive days (Monday first) collapse with a dash */
export function formatWorkDays(days: number[]): string {
  const ordered = WEEK.filter((d) => days.includes(d));
  const parts: string[] = [];
  for (let i = 0; i < ordered.length; ) {
    let j = i;
    while (j + 1 < ordered.length && WEEK.indexOf(ordered[j + 1]) === WEEK.indexOf(ordered[j]) + 1) j++;
    if (j - i >= 2) parts.push(`${DAY_SHORT[ordered[i]]}–${DAY_SHORT[ordered[j]]}`);
    else for (let k = i; k <= j; k++) parts.push(DAY_SHORT[ordered[k]]);
    i = j + 1;
  }
  const count = ordered.length === 1 ? "1 giorno" : `${ordered.length} giorni`;
  return `${parts.join(", ")} · ${count}`;
}

/** Morning and afternoon work periods, in minutes since midnight */
export function getPeriods(schedule: WorkSchedule) {
  const lunchStart = timeToMinutes(schedule.lunchStart);
  return {
    morning: { start: timeToMinutes(schedule.start), end: lunchStart },
    afternoon: { start: lunchStart + schedule.lunchMinutes, end: timeToMinutes(schedule.end) },
  };
}

/** Per-field validation for the settings form; empty object when the schedule is valid */
export function getScheduleErrors(s: WorkSchedule): ScheduleErrors {
  const errors: ScheduleErrors = {};
  const timeOk = (t: string) => TIME_RE.test(t);
  for (const key of ["start", "lunchStart", "end"] as const) {
    if (!timeOk(s[key])) errors[key] = "Inserisci un orario";
  }
  if (!Number.isInteger(s.lunchMinutes) || s.lunchMinutes <= 0) errors.lunchMinutes = "Inserisci una durata maggiore di 0";
  if (s.workDays.length === 0) errors.workDays = "Scegli almeno un giorno";

  if (!errors.start && !errors.lunchStart && timeToMinutes(s.start) >= timeToMinutes(s.lunchStart)) {
    errors.start = `Deve venire prima della pausa (${s.lunchStart})`;
  }
  if (!errors.lunchStart && !errors.lunchMinutes && !errors.end) {
    const lunchEnd = timeToMinutes(s.lunchStart) + s.lunchMinutes;
    if (lunchEnd >= timeToMinutes(s.end)) errors.end = `Deve venire dopo il rientro (${minutesToTime(lunchEnd)})`;
  }
  return errors;
}

/** Right shape (e.g. data read from storage) and no validation errors */
export function isValidSchedule(value: unknown): value is WorkSchedule {
  const s = value as Partial<WorkSchedule> | null;
  if (![s?.start, s?.lunchStart, s?.end].every((t) => typeof t === "string")) return false;
  if (typeof s?.lunchMinutes !== "number") return false;
  const days = s.workDays;
  if (!Array.isArray(days) || !days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) return false;
  return Object.keys(getScheduleErrors(s as WorkSchedule)).length === 0;
}

/** Get current phase of the day */
export function getCurrentPhase(now: Date, schedule: WorkSchedule): WorkPhase {
  if (!schedule.workDays.includes(now.getDay())) return "day-off";
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
  if (!schedule.workDays.includes(now.getDay())) return 0;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const { morning, afternoon } = getPeriods(schedule);
  const morningDuration = morning.end - morning.start;

  if (currentMinutes <= morning.start) return 0;
  if (currentMinutes <= morning.end) return currentMinutes - morning.start;
  if (currentMinutes <= afternoon.start) return morningDuration;
  if (currentMinutes <= afternoon.end) return morningDuration + (currentMinutes - afternoon.start);
  return morningDuration + (afternoon.end - afternoon.start);
}

/** Clock time left until start (before work), lunch (morning) or end of day (from lunch on); null when nothing to count */
export function getCountdown(now: Date, schedule: WorkSchedule): Countdown | null {
  const phase = getCurrentPhase(now, schedule);
  if (phase === "day-off" || phase === "after-work") return null;
  const { morning, afternoon } = getPeriods(schedule);
  const to = phase === "before-work" ? "start" : phase === "morning" ? "lunch" : "end";
  const target = { start: morning.start, lunch: morning.end, end: afternoon.end }[to] * 60;
  return { to, seconds: target - secondsOfDay(now) };
}

/** Clock time left until the end of the current slot (before work, morning, lunch, afternoon); null when none */
export function getSlotCountdown(now: Date, schedule: WorkSchedule): SlotCountdown | null {
  const phase = getCurrentPhase(now, schedule);
  const { morning, afternoon } = getPeriods(schedule);
  const slotEnd: Partial<Record<WorkPhase, number>> = {
    "before-work": morning.start,
    morning: morning.end,
    "lunch-break": afternoon.start,
    afternoon: afternoon.end,
  };
  const end = slotEnd[phase];
  return end === undefined ? null : { phase, seconds: end * 60 - secondsOfDay(now) };
}

/** Next working day after today: "domani" or the weekday name ("lunedì") */
export function getNextWorkDay(now: Date, schedule: WorkSchedule): string {
  for (let k = 1; k <= 7; k++) {
    const day = (now.getDay() + k) % 7;
    if (schedule.workDays.includes(day)) return k === 1 ? "domani" : DAY_LONG[day];
  }
  return "";
}

function secondsOfDay(now: Date): number {
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

type StoredSchedule = Partial<WorkSchedule> & {
  /** v2: days off instead of working days */
  restDays?: number[];
  /** v1: two explicit periods */
  morning?: { start: string; end: string };
  afternoon?: { start: string; end: string };
};

/** Convert formats saved by previous versions; returns the input unchanged if already current */
export function migrate(value: unknown): unknown {
  const old = value as StoredSchedule | null;
  if (old?.morning && old.afternoon) {
    return {
      start: old.morning.start,
      lunchStart: old.morning.end,
      lunchMinutes: timeToMinutes(old.afternoon.start) - timeToMinutes(old.morning.end),
      end: old.afternoon.end,
      workDays: DEFAULT_SCHEDULE.workDays,
    };
  }
  if (old && Array.isArray(old.restDays) && !old.workDays) {
    const { restDays, ...rest } = old;
    return { ...rest, workDays: WEEK.filter((d) => !restDays.includes(d)) };
  }
  return value;
}

/** Load schedule from localStorage; null if never configured or invalid. Old formats are converted and saved back. */
export function loadSchedule(): WorkSchedule | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    const saved = migrate(raw);
    if (isValidSchedule(saved)) {
      if (saved !== raw) saveSchedule(saved);
      return saved;
    }
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
