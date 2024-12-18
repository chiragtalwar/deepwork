import { useEffect, useState } from 'react';
import { Icons } from '../ui/icons';

interface FocusProgressProps {
  duration: number; // in minutes
  startTime: Date;
}

export function FocusProgress({ duration, startTime }: FocusProgressProps) {
  const [progress, setProgress] = useState(0);
  const [focusedTime, setFocusedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(duration);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const elapsedMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);
      const newProgress = Math.min((elapsedMinutes / duration) * 100, 100);
      const newFocusedTime = Math.min(Math.floor(elapsedMinutes), duration);
      const newRemainingTime = Math.max(duration - newFocusedTime, 0);

      setProgress(newProgress);
      setFocusedTime(newFocusedTime);
      setRemainingTime(newRemainingTime);

      if (newProgress >= 100) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, startTime]);

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icons.target className="w-4 h-4 text-emerald-500/70" />
          <h3 className="text-sm font-medium text-white/80">Focus Progress</h3>
        </div>
        <span className="text-2xl font-semibold text-white/90">{Math.round(progress)}%</span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2 rounded-full bg-white/[0.03] overflow-hidden">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-emerald-500/50 to-emerald-400/50 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stats */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-white/40">Focused Time</p>
            <p className="text-white/90 font-medium">{focusedTime} minutes</p>
          </div>
          <div>
            <p className="text-white/40">Remaining</p>
            <p className="text-white/90 font-medium">{remainingTime} minutes</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-emerald-400">In Focus</span>
        </div>
      </div>
    </div>
  );
} 