import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/button'
import { Icons } from '../ui/icons'
import { useNavigate, useLocation } from "react-router-dom"

export const Navbar = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Don't render navbar on landing page, auth page, and contact page
  if (location.pathname === '/' || location.pathname === '/auth' || location.pathname === '/contact') {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="fixed top-0 w-full z-50 px-12 py-6 bg-gradient-to-b from-black/20 to-transparent">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img 
            src="/assets/logo.png" 
            alt="Focuso.club" 
            className="h-6 w-6 object-contain" 
          />
          <span className="text-[#dfe4e3] text-xl font-light tracking-wide">
            Focuso.club
          </span>
        </div>

        {/* Navigation Items */}
        {user && (
          <div className="flex items-center gap-6">
            {/* Available Rooms */}
            <button
              onClick={() => navigate('/rooms')}
              className="group relative px-4 py-2 text-[#dfe4e3] hover:text-white transition-colors duration-300"
            >
              <span className="relative z-10 text-sm font-light tracking-wide">
                Available Rooms
              </span>
              <div className="absolute inset-0 bg-white/[0.03] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>

            {/* Analytics */}
            <button
              onClick={() => navigate('/dashboard')}
              className="group relative px-4 py-2 text-[#dfe4e3] hover:text-white transition-colors duration-300"
            >
              <span className="relative z-10 text-sm font-light tracking-wide">
                Analytics
              </span>
              <div className="absolute inset-0 bg-white/[0.03] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>

            {/* Profile */}
            <button
              onClick={() => navigate('/profile')}
              className="group relative px-4 py-2 text-[#dfe4e3] hover:text-white transition-colors duration-300"
            >
              <span className="relative z-10 text-sm font-light tracking-wide">
                Profile
              </span>
              <div className="absolute inset-0 bg-white/[0.03] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="group relative px-5 py-2 rounded-lg overflow-hidden transition-all duration-500"
            >
              {/* Base gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#2a3f4d] via-[#435d6d] to-[#517181] opacity-90" />
              
              {/* Animated spotlight effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-[-60deg] translate-x-[-200%] group-hover:translate-x-[200%] transition-transform ease-out duration-1000" />
              
              {/* Subtle noise texture */}
              <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay">
                <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat animate-subtle-shift" />
              </div>

              {/* Content wrapper */}
              <div className="relative flex items-center justify-center gap-2">
                <span className="text-sm font-light tracking-wide text-white group-hover:text-white transition-all duration-500">
                  Sign Out
                </span>
              </div>

              {/* Edge highlight */}
              <div className="absolute inset-0 rounded-lg opacity-25 group-hover:opacity-40 transition-opacity duration-500">
                <div className="absolute inset-[-2px] rounded-lg bg-gradient-to-t from-transparent via-white/2 to-white/2" />
              </div>
            </button>
          </div>
        )}
      </div>
    </nav>
  )
} 