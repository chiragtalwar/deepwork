import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/button'
import { Icons } from '../ui/icons'
import { useNavigate } from "react-router-dom"

export const Navbar = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/')}
            className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
          >
            Haven
          </button>
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/rooms')}
            >
              Available Rooms
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
            >
              Analytics
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/profile')}
            >
              Profile
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
} 