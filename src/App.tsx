import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWorkTime } from "./hooks/useWorkTime";
import { BlockGrid } from "./components/BlockGrid";
import { TimerHeader } from "./components/TimerHeader";
import { SetupScreen } from "./components/SetupScreen";
import { type SlotCountdown, type WorkPhase, formatCountdown, getPeriods } from "./utils/timeUtils";
import { getTone, loadPalette, savePalette } from "./utils/palette";
import "./App.css";

const SLOT_NAMES: Partial<Record<WorkPhase, string>> = {
  "before-work": "Inizio",
  morning: "Mattina",
  "lunch-break": "Pranzo",
  afternoon: "Pomeriggio",
};

/** Tab title: current slot and time left until it ends, e.g. "Mattina · 1:32:18" */
function getTitle(phase: WorkPhase, slot: SlotCountdown | null): string {
  if (slot) return `${SLOT_NAMES[slot.phase]} · ${formatCountdown(slot.seconds)}`;
  return phase === "day-off" ? "Libero" : "Finita";
}

function App() {
  const { now, schedule, isConfigured, elapsedMinutes, phase, countdown, slotCountdown, updateSchedule } =
    useWorkTime();
  const [setupOpen, setSetupOpen] = useState(!isConfigured);
  const [palette, setPalette] = useState(loadPalette);
  const paletteAtOpen = useRef(palette);
  const isWorking = phase === "morning" || phase === "afternoon";

  const { morning, afternoon } = getPeriods(schedule);
  const morningMinutes = morning.end - morning.start;
  const totalMinutes = morningMinutes + (afternoon.end - afternoon.start);

  // Layout effect: apply before paint so the saved palette shows without a flash
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = palette;
    root.dataset.tone = getTone(palette);
    // Status bar / toolbar tint follows the palette background
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", getComputedStyle(root).getPropertyValue("--bg").trim());
  }, [palette]);

  const title = getTitle(phase, slotCountdown);
  useEffect(() => {
    document.title = title;
  }, [title]);

  const openSetup = () => {
    paletteAtOpen.current = palette;
    setSetupOpen(true);
  };

  const closeSetup = () => {
    setSetupOpen(false);
    // Safari 26 reads its bar / safe-area color only on page load: reload so it picks up the new palette.
    // Schedule and palette are already saved at this point.
    if (palette !== paletteAtOpen.current) location.reload();
  };

  return (
    <div className={`page${phase === "day-off" ? " page--day-off" : ""}`}>
      <button className="settings-btn" aria-label="Impostazioni" onClick={openSetup}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      <TimerHeader now={now} schedule={schedule} phase={phase} countdown={countdown} slotCountdown={slotCountdown} />

      {/* Worked time over total work time (lunch excluded); the tick marks the lunch break */}
      <div className="progress" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${(elapsedMinutes / totalMinutes) * 100}%` }} />
        <span className="progress-tick" style={{ left: `${(morningMinutes / totalMinutes) * 100}%` }} />
      </div>

      <BlockGrid
        schedule={schedule}
        elapsedMinutes={elapsedMinutes}
        currentIndex={isWorking ? elapsedMinutes : -1}
        currentSeconds={now.getSeconds()}
      />

      {setupOpen && (
        <SetupScreen
          schedule={schedule}
          palette={palette}
          onPaletteChange={(id) => {
            setPalette(id);
            savePalette(id);
          }}
          onSave={(s) => {
            updateSchedule(s);
            closeSetup();
          }}
          onClose={isConfigured ? closeSetup : undefined}
        />
      )}
    </div>
  );
}

export default App;
