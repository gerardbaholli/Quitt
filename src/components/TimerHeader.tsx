import {
  type Countdown,
  type SlotCountdown,
  type WorkPhase,
  type WorkSchedule,
  formatCountdown,
  formatDuration,
  getNextWorkDay,
  getPeriods,
  minutesToShortTime,
  minutesToTime,
} from "../utils/timeUtils";
import "./TimerHeader.css";

interface TimerHeaderProps {
  now: Date;
  schedule: WorkSchedule;
  phase: WorkPhase;
  countdown: Countdown | null;
  slotCountdown: SlotCountdown | null;
}

const COUNTDOWN_LABELS: Record<Countdown["to"], string> = {
  start: "All'inizio",
  lunch: "Alla pausa pranzo",
  end: "Alla fine",
};

/** Index of the current slot in [morning, lunch, afternoon]; -1 before work or on a day off, 3 after work */
const CURRENT_SLOT: Record<WorkPhase, number> = {
  "day-off": -1,
  "before-work": -1,
  morning: 0,
  "lunch-break": 1,
  afternoon: 2,
  "after-work": 3,
};

export function TimerHeader({ now, schedule, phase, countdown, slotCountdown }: TimerHeaderProps) {
  const { morning, afternoon } = getPeriods(schedule);
  const workMinutes = morning.end - morning.start + (afternoon.end - afternoon.start);

  const slots = [
    { name: "Mattina", start: morning.start, end: morning.end },
    { name: "Pausa", start: morning.end, end: afternoon.start },
    { name: "Pomeriggio", start: afternoon.start, end: afternoon.end },
  ];
  const current = CURRENT_SLOT[phase];

  let note = "";
  if (phase === "lunch-break" && slotCountdown) {
    note = `in pausa · rientro tra ${formatDuration(Math.ceil(slotCountdown.seconds / 60))}`;
  } else if (phase === "after-work") {
    note = `${schedule.start} – ${schedule.end} · ${formatDuration(workMinutes)} di lavoro`;
  } else if (phase === "day-off") {
    note = `si riprende ${getNextWorkDay(now, schedule)} alle ${schedule.start}`;
  }

  const value = countdown && formatCountdown(countdown.seconds);

  return (
    <header className="head">
      <div className="head-timer">
        {countdown && value ? (
          <>
            <p className="head-label">{COUNTDOWN_LABELS[countdown.to]}</p>
            <p className="head-value">
              <span className="head-hm">{value.slice(0, -3)}</span>
              <span className="head-ss">{value.slice(-3)}</span>
            </p>
          </>
        ) : (
          <p className="head-value head-word">{phase === "day-off" ? "Giorno libero" : "Giornata finita"}</p>
        )}
        {note && <p className="head-note">{note}</p>}
      </div>

      <ol className="phases" aria-label="Fasi della giornata">
        {slots.map((slot, i) => {
          const state = i < current ? "past" : i === current ? "current" : "future";
          return (
            <li key={slot.name} className={`phase phase--${state}`} aria-current={state === "current" ? "step" : undefined}>
              <span className="phase-mark" aria-hidden="true" />
              <span className="phase-name">{slot.name}</span>
              <span className="phase-range phase-range--long">
                {minutesToTime(slot.start)}–{minutesToTime(slot.end)}
              </span>
              <span className="phase-range phase-range--short">
                {minutesToShortTime(slot.start)}–{minutesToShortTime(slot.end)}
              </span>
            </li>
          );
        })}
      </ol>
    </header>
  );
}
