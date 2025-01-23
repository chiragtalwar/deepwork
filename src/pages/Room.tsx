import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { VideoRoom } from '../components/room/VideoRoom'
import { Timer } from '../components/room/Timer'
import { ParticipantList } from '../components/room/ParticipantList'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Icons } from '../components/ui/icons'
import { useRoomContext } from '../contexts/RoomContext'
import { supabase } from '../lib/supabase'

export function Room() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { joinRoom, leaveRoom } = useRoomContext()
  const mounted = useRef(true)
  const [roomData, setRoomData] = useState<{ duration: number, start_time: string } | null>(null)

  useEffect(() => {
    mounted.current = true
    
    return () => {
      mounted.current = false
      leaveRoom()
    }
  }, [])

  useEffect(() => {
    if (!roomId || !user || !mounted.current) return

    // Fetch room data including duration
    const fetchRoomData = async () => {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('duration, start_time')
          .eq('id', roomId)
          .single()

        if (error) throw error
        if (data && mounted.current) {
          setRoomData(data)
        }
      } catch (error) {
        console.error('Error fetching room data:', error)
        if (mounted.current) {
          navigate('/rooms')
        }
      }
    }

    fetchRoomData()
    joinRoom(roomId).catch(() => {
      if (mounted.current) {
        navigate('/rooms')
      }
    })
  }, [roomId, user])

  const handleSessionComplete = () => {
    // Leave the room and navigate to rooms page with celebration state
    leaveRoom();
    navigate('/rooms', {
      state: {
        showCelebration: true,
        sessionDuration: roomData?.duration || 0
      },
      replace: true
    });
  };

  if (!roomId || !user || !roomData) return null

  return (
    <div className="h-screen overflow-hidden">
      <VideoRoom 
        key={roomId}
        roomId={roomId} 
        duration={roomData.duration}
        roomStartTime={roomData.start_time}
        onSessionComplete={handleSessionComplete}
      />
    </div>
  )
} 