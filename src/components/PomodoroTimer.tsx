import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Volume2,
  VolumeX
} from 'lucide-react';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const MODE_DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60
};

export const PomodoroTimer: React.FC = () => {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState<number>(MODE_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Web Audio API chime synthesis on completion
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      // Pleasant melodic chime: 523.25 Hz (C5) -> 659.25 Hz (E5) -> 783.99 Hz (G5)
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15);
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.85);
    } catch (_) {}
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, soundEnabled]);

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(MODE_DURATIONS[newMode]);
    setIsRunning(false);
    setIsMenuOpen(false);
  };

  const toggleTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(MODE_DURATIONS[mode]);
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(MODE_DURATIONS[mode]);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeFormatted = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const total = MODE_DURATIONS[mode];
  const progressPercent = Math.round(((total - timeLeft) / total) * 100);

  return (
    <div className="relative select-none">
      {/* Compact Header Pill */}
      <div className="relative flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-gray-300 overflow-hidden">
        {/* Progress micro-bar */}
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-1.5 hover:text-white transition"
          title="Change Focus / Break Mode"
        >
          {mode === 'focus' ? (
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
          ) : (
            <Coffee className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="font-mono font-bold tracking-wider text-white">
            {timeFormatted}
          </span>
        </button>

        <div className="w-[1px] h-3.5 bg-gray-800 mx-0.5" />

        <button
          onClick={toggleTimer}
          className={`p-1 rounded transition ${
            isRunning
              ? 'text-amber-400 hover:bg-gray-800'
              : 'text-emerald-400 hover:bg-gray-800'
          }`}
          title={isRunning ? 'Pause Timer' : 'Start Focus Session'}
        >
          {isRunning ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
        </button>

        <button
          onClick={resetTimer}
          className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition"
          title="Reset Timer"
        >
          <RotateCcw className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Mode Selection Dropdown */}
      {isMenuOpen && (
        <div className="absolute top-full mt-2 left-0 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-2.5 z-50 min-w-[190px] flex flex-col gap-1.5">
          <div className="text-[10px] uppercase font-bold text-gray-500 px-2 py-0.5 tracking-wider">
            Pomodoro Focus Modes
          </div>

          <button
            onClick={() => switchMode('focus')}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              mode === 'focus'
                ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/30'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
              <span>Deep Focus</span>
            </div>
            <span className="font-mono text-gray-400 text-[11px]">25m</span>
          </button>

          <button
            onClick={() => switchMode('shortBreak')}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              mode === 'shortBreak'
                ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/30'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Coffee className="w-3.5 h-3.5 text-emerald-400" />
              <span>Short Break</span>
            </div>
            <span className="font-mono text-gray-400 text-[11px]">5m</span>
          </button>

          <button
            onClick={() => switchMode('longBreak')}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              mode === 'longBreak'
                ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/30'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Coffee className="w-3.5 h-3.5 text-emerald-400" />
              <span>Long Break</span>
            </div>
            <span className="font-mono text-gray-400 text-[11px]">15m</span>
          </button>

          <div className="border-t border-gray-800 pt-1.5 mt-0.5 flex items-center justify-between px-2">
            <span className="text-[11px] text-gray-400">Audio Chime</span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1 rounded text-gray-400 hover:text-white"
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
