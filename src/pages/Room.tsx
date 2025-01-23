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

  const handleSessionComplete = async () => {
    try {
      // 1. Update user stats first
      if (user?.id && roomData?.duration) {
        // Get current stats for this user
        const { data: currentStats, error: statsError } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (statsError && statsError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Error fetching user stats:', statsError);
        }

        const now = new Date();
        const lastSessionDate = currentStats?.last_session_date ? new Date(currentStats.last_session_date) : null;
        
        // Check if it's a consecutive day
        const isConsecutiveDay = lastSessionDate && 
          now.toISOString().split('T')[0] !== lastSessionDate.toISOString().split('T')[0] && 
          Math.abs(now.getTime() - lastSessionDate.getTime()) <= 48 * 60 * 60 * 1000;

        // Calculate weekly focus minutes
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week
        startOfWeek.setHours(0, 0, 0, 0);

        let weeklyMinutes = roomData.duration; // Start with current session
        if (currentStats?.last_session_date) {
          const lastSessionInCurrentWeek = new Date(currentStats.last_session_date) >= startOfWeek;
          if (lastSessionInCurrentWeek) {
            weeklyMinutes += currentStats.weekly_focus_minutes;
          }
        }

        const newStats = {
          user_id: user.id,
          total_sessions: (currentStats?.total_sessions || 0) + 1,
          weekly_focus_minutes: weeklyMinutes,
          current_streak: isConsecutiveDay ? (currentStats?.current_streak || 0) + 1 : 1,
          last_session_date: now.toISOString()
        };

        // Upsert the stats - this will create or update based on user_id
        const { error: upsertError } = await supabase
          .from('user_stats')
          .upsert(newStats, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('Error updating user stats:', upsertError);
        }
      }

      // 2. Remove all participants from the room
      const { error: participantsError } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId);

      if (participantsError) {
        console.error('Error cleaning up room participants:', participantsError);
      }

      // 3. Leave the room and navigate to rooms page with celebration state
      leaveRoom();
      navigate('/rooms', {
        state: {
          showCelebration: true,
          sessionDuration: roomData?.duration || 0
        },
        replace: true
      });
    } catch (err) {
      console.error('Error in handleSessionComplete:', err);
    }
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