import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { RoomScheduler } from '../components/room/RoomScheduler'
import { Icons } from '../components/ui/icons'
import { Button } from '../components/ui/button'
import type { RoomFilter } from '../types/room'
import { useAuth } from '../contexts/AuthContext'

export default function Rooms() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // If you need to refresh any data when tab becomes visible
        // Add fetch calls here
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Background with overlay */}
      <div 
        className="fixed inset-0 z-0"
        style={{ 
          backgroundImage: 'url("/assets/pic7.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#517181]/90 to-[#517181]/75" />
      </div>

      {/* Main Content */}
      <div className="relative container mx-auto px-4 mt-24 pb-20">
        

        <Tabs 
          defaultValue="upcoming" 
          className="max-w-2xl mx-auto"
        >
          <TabsList className="w-full backdrop-blur-sm bg-white/[0.03] p-1.5 rounded-xl mb-2">
            <TabsTrigger 
              value="upcoming"
              className="w-1/3 py-3 rounded-lg text-sm font-light transition-all
                data-[state=active]:bg-white/10 data-[state=active]:text-white/90 
                text-white/60"
            >
              Upcoming Sessions
            </TabsTrigger>
            <TabsTrigger 
              value="hour"
              className="w-1/3 py-3 rounded-lg text-sm font-light transition-all
                data-[state=active]:bg-white/10 data-[state=active]:text-white/90 
                text-white/60"
            >
              Focus: 50 Minutes
            </TabsTrigger>
            <TabsTrigger 
              value="half"
              className="w-1/3 py-3 rounded-lg text-sm font-light transition-all
                data-[state=active]:bg-white/10 data-[state=active]:text-white/90 
                text-white/60"
            >
             Sprint: 25 Minutes
            </TabsTrigger>
          </TabsList>

          <div className="space-y-6"> {/* Increased gap between rooms */}
            <TabsContent value="upcoming">
              <RoomScheduler filter="upcoming" />
            </TabsContent>

            <TabsContent value="hour">
              <RoomScheduler filter="hour" />
            </TabsContent>

            <TabsContent value="half">
              <RoomScheduler filter="half" />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
} 