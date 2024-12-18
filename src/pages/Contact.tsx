import { motion } from "framer-motion";
import { Icons } from "@/components/ui/icons";
import { useNavigate } from "react-router-dom";

export default function Contact() {
  const navigate = useNavigate();
  const twitterHandle = "@Chirag10x";

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-[#1e2f3d] to-[#2a3f4d] overflow-hidden">
      {/* Minimal Elegant Navbar - Copied from Landing.tsx */}
      <nav className="fixed top-0 w-full z-50 px-12 py-6 bg-gradient-to-b from-black/20 to-transparent">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <img 
              src="./assets/logo.png" 
              alt="Focuso.club" 
              className="h-6 w-6 object-contain" 
            />
            <span className="text-[#dfe4e3] text-xl font-light tracking-wide hover:text-white transition-colors">
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
              
              {/* Content wrapper */}
              <div className="relative flex items-center justify-center gap-2 text-sm">
                <span className="font-light tracking-wider text-white">
                  Sign In
                </span>
                <Icons.check className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative container mx-auto px-4 py-24 min-h-screen flex items-center justify-center">
        <div className="max-w-5xl w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            {/* Steve's Image */}
            <div className="relative group mb-12 mx-auto w-fit">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#517181] via-[#7da1b0] to-[#517181] rounded-2xl opacity-75 blur group-hover:opacity-100 transition duration-1000" />
              <div className="relative aspect-[16/9] w-[640px] rounded-xl overflow-hidden bg-[#1e2f3d]">
                <img 
                  src="./assets/steve1.png" 
                  alt="Steve" 
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                />
              </div>
            </div>

            {/* Steve Jobs Tribute */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
              className="text-center mb-12"
            >
              <div className="relative inline-block">
                {/* Subtle glow effect */}
                <div className="absolute -inset-4 bg-white/5 rounded-full blur-xl opacity-50" />
                
                {/* Content */}
                <div className="relative space-y-2">
                  <h2 className="text-2xl text-white/90 font-light tracking-widest">
                    Steve Jobs
                  </h2>
                  <p className="text-white/60 font-light tracking-wider text-sm">
                    February 24, 1955 - October 5, 2011
                  </p>
                  
                  {/* Decorative line */}
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <div className="text-white/30 text-xs">●</div>
                    <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contact Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
              className="text-center"
            >
              <h1 className="text-4xl font-light text-white mb-6 tracking-wide">
                Let's Connect
              </h1>
              <a 
                href="https://x.com/Chirag10x"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl overflow-hidden transition-all duration-500"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#2a3f4d] via-[#435d6d] to-[#517181] opacity-90" />
                <div className="relative flex items-center gap-3">
                  <Icons.twitter className="w-5 h-5 text-white" />
                  <span className="text-white font-light tracking-wider">
                    {twitterHandle}
                  </span>
                </div>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
