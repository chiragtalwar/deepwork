import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { RoomScheduler } from '../components/room/RoomScheduler'
import { Icons } from '../components/ui/icons'
import { Button } from '../components/ui/button'
import type { RoomFilter } from '../types/room'

export default function Rooms() {
  const navigate = useNavigate();

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
        <Button
          onClick={() => navigate('/test-room')}
          className="fixed bottom-6 right-6 bg-emerald-500/20 hover:bg-emerald-500/30 backdrop-blur-sm z-50 
            border border-white/10 shadow-lg"
          size="lg"
        >
          <Icons.video className="mr-2 h-4 w-4" />
          Test Video Room
        </Button>

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
              1 Hour Focus
            </TabsTrigger>
            <TabsTrigger 
              value="half"
              className="w-1/3 py-3 rounded-lg text-sm font-light transition-all
                data-[state=active]:bg-white/10 data-[state=active]:text-white/90 
                text-white/60"
            >
              30 Min Sprint
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