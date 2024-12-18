import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Icons } from '../ui/icons'
import { useRoomContext } from '../../contexts/RoomContext'

export function Timer() {
  const { duration, isLoading } = useRoomContext();
  const [timeLeft, setTimeLeft] = useState(duration)

  useEffect(() => {
    if (!duration) return;

    setTimeLeft(duration);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [duration])

  if (isLoading) {
    return (
      <Card className="backdrop-blur-md bg-white/[0.08] border border-white/[0.08]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white/90">
            <Icons.sun className="h-5 w-5" />
            Loading Timer...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <Card className="backdrop-blur-md bg-white/[0.08] border border-white/[0.08]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white/90">
          <Icons.sun className="h-5 w-5" />
          Time Remaining
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-light text-center text-white/90">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </CardContent>
    </Card>
  )
} 