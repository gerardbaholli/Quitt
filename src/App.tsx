import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWorkTime } from "./hooks/useWorkTime";
import { BlockGrid } from "./components/BlockGrid";
import { SetupScreen } from "./components/SetupScreen";
import { type Countdown, type SlotCountdown, type WorkPhase, formatCountdown } from "./utils/timeUtils";
import { loadPalette, savePalette } from "./utils/palette";
import settingsIcon from "./assets/settings.svg";
import "./App.css";

function getTimer(phase: WorkPhase, countdown: Countdown | null): { value: string; label: string } {
  if (countdown) {
    return {
      value: formatCountdown(countdown.seconds),
      label: countdown.to === "lunch" ? "alla pausa pranzo" : "alla fine",
    };
  }
  return { value: phase === "day-off" ? "Giorno libero" : "Giornata finita", label: "" };
}

const SLOT_NAMES: Partial<Record<WorkPhase, string>> = {
  "before-work": "Inizio",
  morning: "Mattina",
  "lunch-break": "Pranzo",
  afternoon: "Pomeriggio",
};

/** Tab title: current slot and time left until it ends, e.g. "Mattina · 1:32:18" */
function getTitle(slot: SlotCountdown | null): string {
  return slot ? `${SLOT_NAMES[slot.phase]} · ${formatCountdown(slot.seconds)}` : "Quitt";
}

function App() {
  const { schedule, isConfigured, elapsedMinutes, phase, countdown, slotCountdown, currentSeconds, updateSchedule } =
    useWorkTime();
  const [setupOpen, setSetupOpen] = useState(!isConfigured);
  const [palette, setPalette] = useState(loadPalette);
  const paletteAtOpen = useRef(palette);
  const timer = getTimer(phase, countdown);
  const isWorking = phase === "morning" || phase === "afternoon";

  // Layout effect: apply before paint so the saved palette shows without a flash
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = palette;
    // Status bar / toolbar tint follows the palette background
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", getComputedStyle(root).getPropertyValue("--bg").trim());
  }, [palette]);

  const title = getTitle(slotCountdown);
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
    <>
      <BlockGrid
        schedule={schedule}
        elapsedMinutes={elapsedMinutes}
        currentIndex={isWorking ? elapsedMinutes : -1}
        currentSeconds={currentSeconds}
        timerValue={timer.value}
        timerLabel={timer.label}
      />
      <button className="settings-btn" onClick={openSetup}>
        <img src={settingsIcon} alt="Impostazioni" width={24} height={24} />
      </button>
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
    </>
  );
}

export default App;
