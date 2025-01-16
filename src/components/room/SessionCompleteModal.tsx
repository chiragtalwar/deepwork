import { useEffect, useState } from 'react';
import { Icons } from '../ui/icons';
import confetti from 'canvas-confetti';

interface SessionCompleteModalProps {
  duration: number;
  onClose: () => void;
}

const YODA_QUOTES = [
  "Focus strong with you, it is! Hmmmm.",
  "Done well, you have. Rest, you must.",
  "Size matters not. Deep work, you achieved!",
  "Powerful you have become. The dark side of procrastination, I sense not.",
  "Difficult to see the future is. But clearer your mind has become.",
  "When 900 years you reach, focus like this, you will not.",
];

const ACHIEVEMENTS = [
  "Your focus power has increased by {X}%!",
  "You've unlocked the 'Jedi Focus Master' achievement!",
  "Your concentration is stronger than {X}% of padawans!",
  "You've completed {X} deep work sessions this week!",
  "Your mindfulness level: Over 9000!",
];

export function SessionCompleteModal({ duration, onClose }: SessionCompleteModalProps) {
  const [quote] = useState(() => YODA_QUOTES[Math.floor(Math.random() * YODA_QUOTES.length)]);
  const [achievement] = useState(() => {
    const template = ACHIEVEMENTS[Math.floor(Math.random() * ACHIEVEMENTS.length)];
    return template.replace('{X}', Math.floor(Math.random() * 90 + 10).toString());
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);

    // Trigger confetti
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div 
        className={`relative bg-gradient-to-b from-slate-900/90 to-slate-950/90 rounded-2xl border border-white/10 shadow-2xl transition-all duration-500 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        <div className="p-8 w-[500px]">
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white/60 transition-colors"
          >
            <Icons.x className="h-5 w-5" />
          </button>

          {/* Content */}
          <div className="flex flex-col items-center text-center">
            {/* Yoda Image */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
              <img 
                src="/assets/focuso.png"
                alt="Yoda"
                className="w-32 h-32 object-contain relative animate-float"
              />
            </div>

            {/* Celebration Text */}
            <div className="space-y-4 mb-6">
              <h2 className="text-2xl font-bold text-white">
                Deep Work Session Complete!
              </h2>
              <p className="text-emerald-400/90 font-medium">
                {duration} minutes of focused work achieved
              </p>
            </div>

            {/* Achievement */}
            <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
              <div className="flex items-center gap-3 text-left">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Icons.trophy className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Achievement Unlocked</p>
                  <p className="text-white font-medium">{achievement}</p>
                </div>
              </div>
            </div>

            {/* Yoda Quote */}
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/5 blur-xl rounded-full" />
              <p className="text-emerald-300/90 text-lg font-medium italic relative">
                "{quote}"
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white/5 rounded-b-2xl border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium py-2 rounded-lg transition-colors"
          >
            Continue Your Journey
          </button>
        </div>
      </div>
    </div>
  );
} 