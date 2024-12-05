import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { RoomScheduler } from '../components/room/RoomScheduler'
import { Icons } from '../components/ui/icons'
import type { RoomFilter } from '../types/room'

export default function Rooms() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Deep Work Sessions</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icons.user className="h-5 w-5" />
          <span>Maximum 5 participants per room</span>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Sessions</TabsTrigger>
          <TabsTrigger value="hour">1 Hour Sessions</TabsTrigger>
          <TabsTrigger value="half">30 Minute Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <RoomScheduler filter="upcoming" />
        </TabsContent>

        <TabsContent value="hour" className="space-y-4">
          <RoomScheduler filter="hour" />
        </TabsContent>

        <TabsContent value="half" className="space-y-4">
          <RoomScheduler filter="half" />
        </TabsContent>
      </Tabs>
    </div>
  )
} 