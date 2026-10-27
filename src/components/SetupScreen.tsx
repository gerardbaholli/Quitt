import { useEffect, useRef, useState } from "react";
import { type WorkSchedule, isValidSchedule } from "../utils/timeUtils";
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

const DAYS = [
  { day: 1, label: "Lun" },
  { day: 2, label: "Mar" },
  { day: 3, label: "Mer" },
  { day: 4, label: "Gio" },
  { day: 5, label: "Ven" },
  { day: 6, label: "Sab" },
  { day: 0, label: "Dom" },
];

export function SetupScreen({ schedule, palette, onPaletteChange, onSave, onClose }: SetupScreenProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState(schedule);
  const valid = isValidSchedule(form);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const set = (patch: Partial<WorkSchedule>) => setForm({ ...form, ...patch });

  const toggleDay = (day: number) =>
    set({
      restDays: form.restDays.includes(day)
        ? form.restDays.filter((d) => d !== day)
        : [...form.restDays, day],
    });

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
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(form);
        }}
      >
        <h2 id="setup-title">Orario lavorativo</h2>

        <div className="setup-fields">
          <label>
            Inizio lavoro
            <input type="time" required value={form.start} onChange={(e) => set({ start: e.target.value })} />
          </label>
          <label>
            Pausa pranzo
            <input type="time" required value={form.lunchStart} onChange={(e) => set({ lunchStart: e.target.value })} />
          </label>
          <label>
            Durata pausa (min)
            <input
              type="number"
              required
              min={0}
              step={5}
              value={Number.isNaN(form.lunchMinutes) ? "" : form.lunchMinutes}
              onChange={(e) => set({ lunchMinutes: e.target.valueAsNumber })}
            />
          </label>
          <label>
            Fine giornata
            <input type="time" required value={form.end} onChange={(e) => set({ end: e.target.value })} />
          </label>
        </div>

        <fieldset className="setup-days">
          <legend>Giorni liberi</legend>
          {DAYS.map(({ day, label }) => (
            <label key={day} className="setup-day">
              <input type="checkbox" checked={form.restDays.includes(day)} onChange={() => toggleDay(day)} />
              {label}
            </label>
          ))}
        </fieldset>

        <fieldset className="setup-palettes">
          <legend>Colori</legend>
          {PALETTES.map(({ id, name }) => (
            // data-palette scopes that palette's colors to this preview
            <label key={id} className="setup-palette" data-palette={id}>
              <input
                type="radio"
                name="palette"
                checked={palette === id}
                onChange={() => onPaletteChange(id)}
              />
              <span className="setup-palette-dots" aria-hidden="true">
                <i className="dot-done" />
                <i className="dot-now" />
              </span>
              <span className="setup-palette-name">{name}</span>
            </label>
          ))}
        </fieldset>

        {!valid && (
          <p className="setup-error" role="alert">
            Controlla gli orari: inizio, pausa e fine devono essere in ordine, con almeno un giorno lavorativo.
          </p>
        )}

        <div className="setup-actions">
          {onClose && (
            <button type="button" className="setup-btn" onClick={onClose}>
              Annulla
            </button>
          )}
          <button type="submit" className="setup-btn setup-btn--primary" disabled={!valid}>
            Salva
          </button>
        </div>
      </form>
    </dialog>
  );
}
