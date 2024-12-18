import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { RoomProvider } from './contexts/RoomContext'
import { Navbar } from './components/layout/Navbar'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { PageLayout } from './components/layout/PageLayout'
import { Toaster } from './components/ui/toaster'

// Public pages
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import AuthCallback from './pages/AuthCallback'
import Contact from './pages/Contact'

// Protected pages
import Dashboard from './pages/Dashboard'
import Rooms from './pages/Rooms'
import { Room } from './pages/Room'
import Profile from './pages/Profile'

function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Navbar />
            <main>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/contact" element={<Contact />} />

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<PageLayout />}>
                    <Route path="/rooms" element={<Rooms />} />
                    <Route path="/room/:roomId" element={<Room />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/profile" element={<Profile />} />
                  </Route>
                </Route>

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Toaster />
          </div>
        </BrowserRouter>
      </RoomProvider>
    </AuthProvider>
  )
}

export default App 