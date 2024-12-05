import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { VideoRoom } from '../components/room/VideoRoom'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Icons } from '../components/ui/icons'

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (!roomId || !user) {
      navigate('/rooms')
      return
    }
  }, [roomId, user, navigate])

  if (!roomId || !user) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <VideoRoom 
            roomId={roomId} 
            userId={user.id}
            displayName={user.user_metadata?.full_name || 'Anonymous'} 
          />
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <Button 
                variant="destructive" 
                onClick={() => navigate('/rooms')}
                className="flex items-center gap-2"
              >
                <Icons.user className="h-4 w-4" />
                Leave Room
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
} 