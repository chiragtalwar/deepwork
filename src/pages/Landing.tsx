import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function Landing() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5174';

  useEffect(() => {
    if (!isLoading && user) {
      // Use relative path instead of absolute URL
      navigate('/rooms');
    }
  }, [user, isLoading, navigate]);

  if (isLoading || user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen relative">
      {/* Minimal Elegant Navbar */}
      <nav className="fixed top-0 w-full z-50 px-12 py-6 bg-gradient-to-b from-black/20 to-transparent">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src="./assets/logo.png" 
              alt="Focuso.club" 
              className="h-6 w-6 object-contain" 
            />
            <span className="text-[#dfe4e3] text-xl font-light tracking-wide">
              Focuso.club
            </span>
          </div>
          
          <div className="flex items-center gap-12">
            <button className="text-[#dfe4e3] hover:text-white text-sm tracking-wide transition-colors">
              Features
            </button>
            <button className="text-[#dfe4e3] hover:text-white text-sm tracking-wide transition-colors">
              Pricing
            </button>
            <button 
              className="text-[#dfe4e3] hover:text-white text-sm tracking-wide transition-colors"
              onClick={() => navigate('/contact')}
            >
              About
            </button>
            <button 
              className="relative group px-8 py-3 overflow-hidden rounded-xl transition-all duration-500"
              onClick={() => navigate('/auth?mode=signin')}
            >
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#2a3f4d] via-[#435d6d] to-[#517181] opacity-90" />
              
              {/* Animated spotlight effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-[-60deg] translate-x-[-200%] group-hover:translate-x-[200%] transition-transform ease-out duration-1000" />
              
              {/* Subtle noise texture */}
              <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay">
                <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat animate-subtle-shift" />
              </div>

              {/* Glowing border effect */}
              <div className="absolute inset-px rounded-xl bg-gradient-to-r from-white/20 to-white/5 blur-sm group-hover:blur-md transition-all duration-500" />
              
              {/* Inner border with gradient */}
              <div className="absolute inset-[1px] rounded-[10px] bg-gradient-to-r from-[#2a3f4d] to-[#517181]">
                <div className="absolute inset-[1px] rounded-lg bg-gradient-to-r from-black/50 to-black/20" />
              </div>

              {/* Content wrapper */}
              <div className="relative flex items-center justify-center gap-2 text-sm">
                {/* Text with gradient */}
                <span className="font-bold tracking-wide bg-gradient-to-r from-white via-white to-white/90 text-transparent bg-clip-text group-hover:to-white transition-all duration-500">
                  Sign In
                </span>

                {/* Animated arrow */}
                <svg 
                  className="w-4 h-4 stroke-white/90 translate-x-0 group-hover:translate-x-0.5 transition-all duration-500" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  strokeWidth="2"
                >
                  <path 
                    d="M5 12h14m-6-6l6 6-6 6" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="group-hover:stroke-white transition-colors duration-500"
                  />
                </svg>

                {/* Radial gradient glow on hover */}
                <div className="absolute -inset-8 bg-gradient-to-r from-[#7da1b0]/0 via-[#7da1b0]/10 to-[#7da1b0]/0 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-700" />
              </div>

              {/* Edge highlight */}
              <div className="absolute inset-0 rounded-xl opacity-25 group-hover:opacity-40 transition-opacity duration-500">
                <div className="absolute inset-[-2px] rounded-xl bg-gradient-to-t from-transparent via-white/2 to-white/2" />
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen">
        {/* Background with subtle gradient overlay */}
        <div 
          className="absolute inset-0"
          style={{ 
            backgroundImage: 'url("./assets/pic6.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Gradient overlay for contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#517181]/75 to-transparent" />
        </div>

        {/* Enhanced Content Layout - Adjusted positioning */}
        <div className="relative w-full h-full flex items-center pl-[220px]">
          <div className="max-w-[720px]">
            {/* Refined Elite Members Badge */}
            <div className="relative group flex items-center gap-3 mb-8 w-fit animate-fade-in">
              {/* Compact container */}
              <div className="relative flex items-center gap-2 py-2 px-4 rounded-full backdrop-blur-lg">
                {/* Refined background */}
                <div className="absolute inset-0 rounded-full bg-white/10 border border-white/[0.15]" />
                
                {/* Subtle pulse indicator */}
                <div className="relative flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1e2f3d] animate-pulse" />
                  <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-[#2a3f4d] animate-ping opacity-75" />
                  <div className="absolute -inset-1 bg-[#1e2f3d]/20 rounded-full blur-sm animate-pulse" />
                </div>

                {/* Refined text content */}
                <div className="relative flex items-center">
                  <span className="text-[13px] tracking-wide">
                    <span className="text-white/90 font-light">25 members in</span>{' '}
                    <span className="text-[#1e2f3d] font-normal tracking-wide">
                      deep focus
                    </span>{' '}
                    <span className="text-white/90 font-light">sessions</span>
                  </span>
                </div>

                {/* Subtle glow effect */}
                <div className="absolute -inset-[0.5px] rounded-full">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/5 to-transparent" />
                </div>
              </div>

              {/* Refined outer glow */}
              <div className="absolute -inset-1 bg-[#1e2f3d]/5 rounded-full blur-lg opacity-40" />
            </div>

            {/* Headline - Enhanced with gradient and animations */}
            <h1 className="font-display text-[82px] font-extralight leading-[1.05] tracking-[-0.02em] mb-6">
              <span className="text-white hover:text-[#7da1b0] transition-colors duration-300">Deep Work.</span>
              <br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#2a3f4d] via-[#435d6d] to-[#517181] text-transparent bg-clip-text hover:opacity-90 transition-all duration-500">
                  Together.
                </span>
                {/* Enhanced underline effect */}
                <div className="absolute -bottom-3 left-0 w-full h-[2px] bg-gradient-to-r from-[#2a3f4d] via-[#7da1b0] to-transparent opacity-75">
                  {/* Animated shine effect */}
                </div>
              </span>
            </h1>

            {/* Enhanced messaging with dark gradient for "1%" */}
            <p className="text-xl font-light mb-8 leading-relaxed max-w-[540px] tracking-wide">
              <span className="block mb-0.5 text-white">
                For the <span className="bg-gradient-to-r from-[#2a3f4d] via-[#435d6d] to-[#517181] text-transparent bg-clip-text font-bold">1%</span> Who Do.
              </span>
              
              {/* Softer color for secondary tagline */}
              <span className="bg-gradient-to-r from-[#2a3f4d] to-[#517181] text-transparent bg-clip-text hover:opacity-90 transition-all duration-500 italic font-normal">
              Focus harder. Achieve faster. Win bigger.
              </span>
            </p>

            {/* CTAs - Enhanced Join the Club button */}
            <div className="flex gap-5 mb-12 mt-1">
              <button 
                onClick={() => navigate('/auth?mode=signup')}
                className="group relative px-8 py-3.5 text-sm text-white rounded-lg overflow-hidden transition-all duration-500"
              >
                {/* Base gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#2a3f4d] via-[#435d6d] to-[#517181] opacity-90" />
                
                {/* Animated spotlight effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-[-60deg] translate-x-[-200%] group-hover:translate-x-[200%] transition-transform ease-out duration-1000" />
                
                {/* Subtle noise texture */}
                <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay">
                  <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat animate-subtle-shift" />
                </div>

                {/* Glowing border effect */}
                <div className="absolute inset-px rounded-lg bg-gradient-to-r from-white/20 to-white/5 blur-sm group-hover:blur-md transition-all duration-500" />
                
                {/* Inner border with gradient */}
                <div className="absolute inset-[1px] rounded-lg bg-gradient-to-r from-[#2a3f4d] to-[#517181]">
                  <div className="absolute inset-[1px] rounded-lg bg-gradient-to-r from-black/50 to-black/20" />
                </div>

                {/* Content wrapper */}
                <div className="relative flex items-center justify-center gap-2">
                  {/* Text with gradient */}
                  <span className="font-normal tracking-wide text-white group-hover:text-white transition-all duration-500">
                    Join the Club
                  </span>

                  {/* Animated arrow */}
                  <svg 
                    className="w-4 h-4 stroke-white/90 translate-x-0 group-hover:translate-x-0.5 transition-all duration-500" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    strokeWidth="2"
                  >
                    <path 
                      d="M5 12h14m-6-6l6 6-6 6" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="group-hover:stroke-white transition-colors duration-500"
                    />
                  </svg>

                  {/* Radial gradient glow on hover */}
                  <div className="absolute -inset-8 bg-gradient-to-r from-[#7da1b0]/0 via-[#7da1b0]/10 to-[#7da1b0]/0 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-700" />
                </div>

                {/* Edge highlight */}
                <div className="absolute inset-0 rounded-lg opacity-25 group-hover:opacity-40 transition-opacity duration-500">
                  <div className="absolute inset-[-2px] rounded-lg bg-gradient-to-t from-transparent via-white/2 to-white/2" />
                </div>
              </button>

              {/* Keep existing Experience a Session button */}
              <button className="group relative px-7 py-3 text-sm rounded-lg overflow-hidden transition-all duration-500">
                {/* Glassmorphic base */}
                <div className="absolute inset-0 bg-white/[0.05] backdrop-blur-sm rounded-lg" />
                
                {/* Animated border gradient */}
                <div className="absolute inset-0 rounded-lg border border-white/[0.05] group-hover:border-white/[0.2] transition-colors duration-500" />
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-[shimmer_2s_infinite]" />
                </div>
                
                {/* Glow effect on hover */}
                <div className="absolute -inset-2 bg-white/[0.02] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
                
                {/* Text with gradient */}
                <span className="relative font-light tracking-wider bg-gradient-to-r from-white/90 to-white/70 hover:from-white hover:to-white/90 transition-all duration-500 bg-clip-text text-transparent">
                  Experience a Session
                </span>
              </button>
            </div>

            {/* Enhanced Stats Section */}
            <div className="grid grid-cols-3 gap-12 max-w-[600px]">
              {[
                { value: '2,400+', label: 'Deep Work Hours', icon: '⏳' },
                { value: '500+', label: 'Club Members', icon: '👥' },
                { value: '98%', label: 'Focus Success', icon: '🎯' }
              ].map(({ value, label, icon }) => (
                <div key={label} className="group relative cursor-default">
                  {/* Glassmorphic Container - Adjusted size */}
                  <div className="relative z-10 px-4 py-3 rounded-lg backdrop-blur-md bg-white/[0.08] border border-white/10 transition-all duration-500 group-hover:bg-white/[0.12]">
                    {/* Value with enhanced styling */}
                    <div className="relative">
                      <span className="block text-2xl font-light text-white tracking-tight">
                        {value}
                      </span>
                      {/* Subtle glow on hover */}
                      <div className="absolute -inset-1 bg-white/5 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>

                    {/* Label with refined styling */}
                    <div className="text-sm font-light">
                      <span className="text-white/60 group-hover:text-white/80 transition-colors duration-300">
                        {label}
                      </span>
                    </div>
                  </div>

                  {/* Subtle shine effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 