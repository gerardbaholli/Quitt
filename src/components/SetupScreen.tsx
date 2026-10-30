import { useEffect, useRef, useState } from "react";
import {
  type WorkSchedule,
  WEEK,
  formatDuration,
  formatWorkDays,
  getPeriods,
  getScheduleErrors,
  minutesToTime,
  timeToMinutes,
} from "../utils/timeUtils";
import { type PaletteId, PALETTES } from "../utils/palette";
import "./SetupScreen.css";

interface SetupScreenProps {
  schedule: WorkSchedule;
  palette: PaletteId;
  /** Applied and saved immediately, independent of Salva/Annulla */
  onPaletteChange: (id: PaletteId) => void;
  onSave: (schedule: WorkSchedule) => void;
  /** Omitted on first run: the schedule must be saved before using the app */
  onClose?: () => void;
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

type Track = "work" | "break";

/** Vertical rail of the timeline: line above and below the row's center, optional square marker */
function Rail({ top, bottom, mark, error }: { top?: Track; bottom?: Track; mark?: "fill" | "hollow"; error?: boolean }) {
  return (
    <span className="tl-rail" data-top={top} data-bottom={bottom} aria-hidden="true">
      {mark && <i className={`tl-mark tl-mark--${mark}${error ? " tl-mark--error" : ""}`} />}
    </span>
  );
}

export function SetupScreen({ schedule, palette, onPaletteChange, onSave, onClose }: SetupScreenProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState(schedule);
  const firstRun = !onClose;

  const errors = getScheduleErrors(form);
  const valid = Object.keys(errors).length === 0;
  const timesValid = !errors.start && !errors.lunchStart && !errors.lunchMinutes && !errors.end;
  const lunchEnd =
    !errors.lunchStart && !errors.lunchMinutes ? minutesToTime(timeToMinutes(form.lunchStart) + form.lunchMinutes) : "—";
  const { morning, afternoon } = getPeriods(form);
  const morningMinutes = morning.end - morning.start;
  const afternoonMinutes = afternoon.end - afternoon.start;
  const total = formatDuration(morningMinutes + afternoonMinutes);

  useEffect(() => {
    const dialog = dialogRef.current;
    // Initial focus on the title instead of the first time field: on iOS focusing it opens the time picker.
    // Native attribute (React's autoFocus isn't rendered to the DOM, so showModal() wouldn't see it).
    dialog?.querySelector("h2")?.setAttribute("autofocus", "");
    dialog?.showModal();
  }, []);

  const set = (patch: Partial<WorkSchedule>) => setForm({ ...form, ...patch });

  const toggleDay = (day: number) =>
    set({ workDays: form.workDays.includes(day) ? form.workDays.filter((d) => d !== day) : [...form.workDays, day] });

  /** Accessibility wiring for a field that may have an inline error */
  const fieldProps = (key: keyof typeof errors) => ({
    "aria-invalid": !!errors[key],
    "aria-describedby": errors[key] ? `setup-${key}-error` : undefined,
  });

  const fieldError = (key: keyof typeof errors) =>
    errors[key] && (
      <p className="tl-error" id={`setup-${key}-error`} role="alert">
        {errors[key]}
      </p>
    );

  return (
    <dialog
      ref={dialogRef}
      className="setup"
      aria-labelledby="setup-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
    >
      <form
        className="setup-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(form);
        }}
      >
        <header className="setup-head">
          <h2 id="setup-title" tabIndex={-1}>
            {firstRun ? "Imposta la tua giornata" : "Impostazioni"}
          </h2>
          {firstRun && <p className="setup-sub">Serve una volta sola. Potrai cambiare tutto dall'ingranaggio in alto a destra.</p>}
        </header>

        <div className="setup-body">
          <section className="setup-col" aria-labelledby="setup-day-title">
            <h3 id="setup-day-title">Giornata</h3>

            <div className="tl">
              <div className="tl-row">
                <Rail bottom="work" mark="fill" error={!!errors.start} />
                <label className="tl-label" htmlFor="setup-start">
                  Inizio lavoro
                </label>
                <input id="setup-start" type="time" required value={form.start} onChange={(e) => set({ start: e.target.value })} {...fieldProps("start")} />
                {fieldError("start")}
              </div>

              <div className="tl-row tl-row--segment">
                <Rail top="work" bottom="work" />
                <span className="tl-segment">mattina · {timesValid ? formatDuration(morningMinutes) : "—"}</span>
              </div>

              <div className="tl-row">
                <Rail top="work" bottom="break" mark="hollow" error={!!errors.lunchStart} />
                <label className="tl-label" htmlFor="setup-lunchStart">
                  Pausa pranzo
                </label>
                <input
                  id="setup-lunchStart"
                  type="time"
                  required
                  value={form.lunchStart}
                  onChange={(e) => set({ lunchStart: e.target.value })}
                  {...fieldProps("lunchStart")}
                />
                {fieldError("lunchStart")}
              </div>

              <div className="tl-row">
                <Rail top="break" bottom="break" />
                <label className="tl-label" htmlFor="setup-lunchMinutes">
                  Durata pausa
                </label>
                <span className="tl-control">
                  <input
                    id="setup-lunchMinutes"
                    className="tl-input-short"
                    type="number"
                    required
                    min={5}
                    max={240}
                    step={5}
                    value={Number.isNaN(form.lunchMinutes) ? "" : form.lunchMinutes}
                    onChange={(e) => set({ lunchMinutes: e.target.valueAsNumber })}
                    {...fieldProps("lunchMinutes")}
                  />
                  <span className="tl-unit">min</span>
                </span>
                {fieldError("lunchMinutes")}
              </div>

              <div className="tl-row">
                <Rail top="break" bottom="work" mark="hollow" />
                <span className="tl-label" id="setup-return-label">
                  Rientro
                </span>
                <span className="tl-control">
                  <output className="tl-output" htmlFor="setup-lunchStart setup-lunchMinutes" aria-labelledby="setup-return-label">
                    {lunchEnd}
                  </output>
                  <span className="tl-unit">calcolato</span>
                </span>
              </div>

              <div className="tl-row tl-row--segment">
                <Rail top="work" bottom="work" />
                <span className="tl-segment">pomeriggio · {timesValid ? formatDuration(afternoonMinutes) : "—"}</span>
              </div>

              <div className="tl-row">
                <Rail top="work" mark="fill" error={!!errors.end} />
                <label className="tl-label" htmlFor="setup-end">
                  Fine giornata
                </label>
                <input id="setup-end" type="time" required value={form.end} onChange={(e) => set({ end: e.target.value })} {...fieldProps("end")} />
                {fieldError("end")}
              </div>
            </div>

            <p className="tl-total">{timesValid ? `${total} di lavoro al giorno` : "Totale non calcolabile"}</p>
          </section>

          <div className="setup-col">
            <section className="setup-section" aria-labelledby="setup-days-title">
              <h3 id="setup-days-title">Giorni lavorativi</h3>
              <div className="days" role="group" aria-labelledby="setup-days-title" aria-describedby={errors.workDays ? "setup-workDays-error" : undefined}>
                {WEEK.map((day) => (
                  <button key={day} type="button" className="day" aria-pressed={form.workDays.includes(day)} onClick={() => toggleDay(day)}>
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
              {form.workDays.length > 0 && <p className="days-summary">{formatWorkDays(form.workDays)}</p>}
              {errors.workDays && (
                <p className="tl-error" id="setup-workDays-error" role="alert">
                  {errors.workDays}
                </p>
              )}
            </section>

            {/* --selected is resolved here, in the active palette, before each preview overrides the tokens */}
            <section className="setup-section setup-colors" aria-labelledby="setup-colors-title">
              <div className="setup-section-head">
                <h3 id="setup-colors-title">Colori</h3>
                <span className="setup-hint">si applicano subito</span>
              </div>
              {(["dark", "light"] as const).map((tone) => (
                <div key={tone} className="palette-group" role="group" aria-labelledby={`setup-palettes-${tone}`}>
                  <p className="palette-group-label" id={`setup-palettes-${tone}`}>
                    {tone === "dark" ? "Scure" : "Chiare"}
                  </p>
                  <div className="palette-grid">
                    {PALETTES.filter((p) => p.tone === tone).map(({ id, name }) => (
                      // data-palette scopes that palette's colors to this preview
                      <button
                        key={id}
                        type="button"
                        className="palette"
                        data-palette={id}
                        aria-pressed={palette === id}
                        onClick={() => onPaletteChange(id)}
                      >
                        <span className="palette-mosaic" aria-hidden="true">
                          <i className="m-done" />
                          <i className="m-done m-done-late" />
                          <i className="m-now" />
                          <i />
                          <i />
                        </span>
                        <span className="palette-name">{name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </div>
        </div>

        <footer className="setup-foot">
          <p className={`setup-status${valid ? "" : " setup-status--error"}`} role="status">
            {valid ? `Rientro alle ${lunchEnd} · ${total} al giorno` : "Correggi i campi segnati per salvare"}
          </p>
          <div className="setup-actions">
            {!firstRun && (
              <button type="button" className="btn" onClick={onClose}>
                Annulla
              </button>
            )}
            <button type="submit" className="btn btn--primary" disabled={!valid}>
              {firstRun ? "Inizia" : "Salva"}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
