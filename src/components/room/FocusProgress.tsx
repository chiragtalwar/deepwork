import { useEffect, useState } from 'react';
import { Icons } from '../ui/icons';

interface FocusProgressProps {
  duration: number;
  startTime: Date;
  onSessionComplete: () => void;
}

export function FocusProgress({ duration, startTime, onSessionComplete }: FocusProgressProps) {
  const [progress, setProgress] = useState(0);
  const [focusedTime, setFocusedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(duration);
  const [isPreStart, setIsPreStart] = useState(false);
  const [hasTriggeredComplete, setHasTriggeredComplete] = useState(false);

  useEffect(() => {
    const updateProgress = () => {
      const now = new Date();
      const startMs = startTime.getTime();
      const nowMs = now.getTime();
      const durationMs = duration * 60 * 1000;
      const elapsedMs = nowMs - startMs;

      if (startMs > nowMs) {
        // Session hasn't started yet
        setIsPreStart(true);
        setProgress(0);
        setFocusedTime(0);
        setRemainingTime(duration);
        return;
      }

      // Session has started
      setIsPreStart(false);

      if (elapsedMs >= durationMs) {
        // Session is complete
        setProgress(100);
        setFocusedTime(duration);
        setRemainingTime(0);
        
        // Trigger session complete once
        if (!hasTriggeredComplete) {
          setHasTriggeredComplete(true);
          onSessionComplete();
        }
        return;
      }

      // Session is in progress
      const currentProgress = (elapsedMs / durationMs) * 100;
      const currentFocusedTime = Math.floor(elapsedMs / (1000 * 60));
      const currentRemainingTime = Math.ceil((durationMs - elapsedMs) / (1000 * 60));

      setProgress(currentProgress);
      setFocusedTime(currentFocusedTime);
      setRemainingTime(currentRemainingTime);
    };

    // Update immediately and then every second
    updateProgress();
    const interval = setInterval(updateProgress, 1000);

    return () => clearInterval(interval);
  }, [duration, startTime, hasTriggeredComplete, onSessionComplete]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-400/20" />
          <h3 className="text-sm font-medium text-white/90">Focus Progress</h3>
        </div>
        <span className="text-2xl font-semibold text-white/90">
          {isPreStart ? "0" : Math.round(progress)}%
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-white/[0.03] overflow-hidden mb-4">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 via-emerald-400/80 to-emerald-300/80 transition-all duration-1000"
          style={{ width: `${isPreStart ? 0 : progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-white/50 text-xs">Focused Time</p>
            <p className="text-white/90 font-medium">
              {focusedTime} minutes
            </p>
          </div>
          <div>
            <p className="text-white/50 text-xs">Remaining</p>
            <p className="text-white/90 font-medium">
              {remainingTime} minutes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 shadow-lg shadow-emerald-500/20">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/50" />
          <span className="text-sm font-medium text-emerald-300">
            {isPreStart ? "Starting Soon" : "In Focus"}
          </span>
        </div>
      </div>
    </div>
  );
} 