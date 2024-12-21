import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Icons } from '../components/ui/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthError } from '@supabase/supabase-js';
import { EmailVerification } from '../components/auth/EmailVerification';
import { supabase } from '@/lib/supabase';

interface FormData {
  fullName: string;
  email: string;
  password: string;
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'signin';
  const navigate = useNavigate();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    setShowVerification(false);
    setVerificationEmail('');
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    // Password validation
    if (mode === 'signup' && formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        if (!formData.fullName.trim()) {
          throw new Error('Please enter your full name');
        }
        await signUpWithEmail(
          formData.email,
          formData.password,
          formData.fullName
        );
        setVerificationEmail(formData.email);
        setShowVerification(true);
      } else {
        await signInWithEmail(
          formData.email,
          formData.password
        );
        const redirect = searchParams.get('redirect') || '/rooms';
        navigate(redirect);
      }
    } catch (err) {
      console.error('Auth error:', err);
      // More user-friendly error messages
      if (err instanceof AuthError) {
        switch (err.message) {
          case 'Invalid login credentials':
            setError('Incorrect email or password');
            break;
          case 'User already registered':
            setError('An account with this email already exists');
            break;
          default:
            setError(err.message);
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const validateInput = (field: string, value: string) => {
    switch (field) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? '' : 'Please enter a valid email';
      case 'password':
        return value.length >= 8 ? '' : 'Password must be at least 8 characters';
      case 'fullName':
        return value.trim() ? '' : 'Please enter your name';
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      const { data } = await signInWithGoogle();
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No redirect URL provided');
      }
    } catch (err) {
      console.error('Google Auth error:', err);
      setError('Failed to connect with Google. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
      });
    } catch (err) {
      console.error('Failed to resend verification email:', err);
    }
  };

  const handleSignInClick = () => {
    setShowVerification(false);
    setVerificationEmail('');
    navigate('/auth?mode=signin');
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen relative flex items-center justify-center"
        style={{ 
          backgroundImage: 'url("/assets/pic7.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Background overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#517181]/90 to-[#517181]/75" />
        
        {/* Loading content */}
        <div className="relative flex flex-col items-center gap-4">
          <Icons.spinner className="h-8 w-8 animate-spin text-white/60" />
          <p className="text-white/80 text-sm">Completing your sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background with overlay */}
      <div 
        className="absolute inset-0"
        style={{ 
          backgroundImage: 'url("./assets/pic7.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#517181]/90 to-[#517181]/75" />
      </div>

      {/* Content */}
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Glassmorphic Card */}
          <div className="backdrop-blur-md bg-white/[0.08] border border-white/10 rounded-2xl p-8 shadow-2xl">
            {/* Logo and Title */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <img 
                  src="./assets/logo.png" 
                  alt="Focuso.club" 
                  className="h-8 w-8 object-contain" 
                />
                <span className="text-white/90 text-2xl font-light tracking-wide">
                  Focuso.club
                </span>
              </div>
              <h1 className="text-2xl font-light text-white/90">
                {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
              </h1>
            </div>

            {/* Google Sign In Button */}
            <button 
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full group relative px-6 py-3 mb-6 rounded-lg overflow-hidden transition-all duration-500"
            >
              <div className="absolute inset-0 bg-white/[0.08] backdrop-blur-sm rounded-lg" />
              <div className="absolute inset-0 rounded-lg border border-white/[0.08] group-hover:border-white/[0.2] transition-colors duration-500" />
              <div className="relative flex items-center justify-center gap-3">
                {isGoogleLoading ? (
                  <Icons.spinner className="h-5 w-5 animate-spin text-white/90" />
                ) : (
                  <Icons.google className="h-5 w-5 text-white/90" />
                )}
                <span className="text-white/90 font-light">
                  {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
                </span>
              </div>
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/[0.08]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-2 text-white/60 uppercase tracking-wider">
                  Or continue with email
                </span>
              </div>
            </div>

            {showVerification ? (
              <EmailVerification 
                email={verificationEmail}
                onResendClick={handleResendVerification}
                onSignInClick={handleSignInClick}
              />
            ) : (
              <>
                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'signup' && (
                    <div className="space-y-2">
                      <Input
                        id="fullName"
                        placeholder="Full Name"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="bg-white/[0.06] border-white/[0.08] text-white/90 placeholder:text-white/40"
                        required
                      />
                    </div>
                  )}

                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={(e) => {
                      const validationError = validateInput('email', e.target.value);
                      if (validationError) setError(validationError);
                    }}
                    className={`
                      bg-white/[0.06] border-white/[0.08] 
                      text-white/90 placeholder:text-white/40
                      focus:ring-2 focus:ring-white/20 
                      transition-all duration-300
                      ${error && error.includes('email') ? 'border-red-400/50' : ''}
                    `}
                    required
                  />

                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`
                        bg-white/[0.06] border-white/[0.08] 
                        text-white/90 placeholder:text-white/40
                        pr-10 
                        ${formData.password.length > 0 && formData.password.length < 8 ? 'border-yellow-400/50' : ''}
                        ${formData.password.length >= 8 ? 'border-green-400/50' : ''}
                      `}
                      required
                    />
                    {formData.password && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {formData.password.length >= 8 ? (
                          <Icons.check className="h-4 w-4 text-green-400" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-yellow-400/50" />
                        )}
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="text-red-400/90 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full group relative px-6 py-3 rounded-lg overflow-hidden transition-all duration-500 mt-6"
                  >
                    {/* Button styling similar to landing page */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#2a3f4d] via-[#435d6d] to-[#517181] opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-180 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                    <div className="relative flex items-center justify-center gap-2">
                      {isLoading && (
                        <Icons.spinner className="h-4 w-4 animate-spin text-white/90" />
                      )}
                      <span className="text-white/90 font-normal">
                        {mode === 'signup' ? 'Create Account' : 'Sign In'}
                      </span>
                    </div>
                  </button>
                </form>
              </>
            )}

            {/* Toggle Sign In/Sign Up */}
            <div className="mt-6 text-center text-sm text-white/60">
              {mode === 'signup' ? (
                <p>
                  Already have an account?{' '}
                  <button
                    onClick={() => navigate('/auth?mode=signin')}
                    className="text-white/90 hover:text-white transition-colors duration-300"
                  >
                    Sign in
                  </button>
                </p>
              ) : (
                <p>
                  Don't have an account?{' '}
                  <button
                    onClick={() => navigate('/auth?mode=signup')}
                    className="text-white/90 hover:text-white transition-colors duration-300"
                  >
                    Create one
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 