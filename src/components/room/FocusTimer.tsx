import { useEffect, useState } from 'react';
import { Icons } from '../ui/icons';

interface FocusTimerProps {
  duration: number; // in minutes
  onComplete?: () => void;
}

export function FocusTimer({ duration, onComplete }: FocusTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration * 60); // Convert to seconds
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });

      setProgress((prev) => {
        const newProgress = (timeLeft / (duration * 60)) * 100;
        return Math.max(0, newProgress);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [duration, isPaused, timeLeft, onComplete]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-10 h-10">
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="20"
            cy="20"
            r="18"
            className="fill-none stroke-white/5 stroke-[2]"
          />
          <circle
            cx="20"
            cy="20"
            r="18"
            className="fill-none stroke-emerald-500/40 stroke-[2]"
            strokeDasharray={`${2 * Math.PI * 18}`}
            strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white/90">
          {formatTime(timeLeft)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-white/50 text-sm font-medium">Focus Session</span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-400">In Progress</span>
        </div>
      </div>
    </div>
  );
} 