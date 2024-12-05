import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { RoomProvider } from './contexts/RoomContext'
import { Navbar } from './components/layout/Navbar'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Rooms from './pages/Rooms'
import Room from './pages/Room'
import Profile from './pages/Profile'

function App() {
  return (
    <Router>
      <AuthProvider>
        <RoomProvider>
          <div className="min-h-screen bg-background">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/room/:roomId" element={<Room />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/rooms" replace />} />
              </Routes>
            </main>
          </div>
        </RoomProvider>
      </AuthProvider>
    </Router>
  )
}

export default App 