import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { VideoRoom } from '../components/room/VideoRoom'
import { Timer } from '../components/room/Timer'
import { ParticipantList } from '../components/room/ParticipantList'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Icons } from '../components/ui/icons'
import { useRoomContext } from '../contexts/RoomContext'

export function Room() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { joinRoom, leaveRoom } = useRoomContext()
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    
    return () => {
      mounted.current = false
      leaveRoom()
    }
  }, [])

  useEffect(() => {
    if (!roomId || !user || !mounted.current) return

    joinRoom(roomId).catch(() => {
      if (mounted.current) {
        navigate('/rooms')
      }
    })
  }, [roomId, user])

  if (!roomId || !user) return null

  return (
    <div className="h-screen overflow-hidden">
      <VideoRoom 
        key={roomId}
        roomId={roomId} 
        displayName={user.email?.split('@')[0] || 'Anonymous'}
      />
    </div>
  )
} 