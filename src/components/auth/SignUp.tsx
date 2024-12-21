import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/button'       
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Icons } from '../ui/icons'

export function SignUp() {
  const { signUpWithEmail, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    
    setIsLoading(true)
    setError('')

    try {
      await signUpWithEmail(email, password, fullName)
      // Changed from /dashboard to /rooms
      navigate('/rooms')
    } catch (err) {
      setError('Failed to create account')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <Button
        variant="outline"
        onClick={() => signInWithGoogle()}
        disabled={isLoading}
        className="w-full"
      >
        <Icons.google className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <form onSubmit={handleEmailSignUp}>
        {error && (
          <div className="text-sm text-red-500 mb-4">{error}</div>
        )}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              disabled={isLoading}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={isLoading}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            <span className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </span>
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Account
          </Button>
        </div>
      </form>
    </div>
  )
} 