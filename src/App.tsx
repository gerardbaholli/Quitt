import { useEffect, useLayoutEffect, useState } from "react";
import { useWorkTime } from "./hooks/useWorkTime";
import { BlockGrid } from "./components/BlockGrid";
import { SetupScreen } from "./components/SetupScreen";
import { type Countdown, type WorkPhase, formatCountdown } from "./utils/timeUtils";
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

function App() {
  const { schedule, isConfigured, elapsedMinutes, phase, countdown, currentSeconds, updateSchedule } = useWorkTime();
  const [setupOpen, setSetupOpen] = useState(!isConfigured);
  const [palette, setPalette] = useState(loadPalette);
  const timer = getTimer(phase, countdown);
  const isWorking = phase === "morning" || phase === "afternoon";

  // Layout effect: apply before paint so the saved palette shows without a flash
  useLayoutEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);

  useEffect(() => {
    document.title = `${timer.value} ${timer.label}`.trim();
  }, [timer.value, timer.label]);

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
      <button className="settings-btn" onClick={() => setSetupOpen(true)}>
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
            setSetupOpen(false);
          }}
          onClose={isConfigured ? () => setSetupOpen(false) : undefined}
        />
      )}
    </>
  );
}

export default App;
