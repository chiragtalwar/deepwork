import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Icons } from '../components/ui/icons';
import { supabase } from '../lib/supabase';
import { useToast } from "../components/ui/use-toast";
import { useAuth } from '../hooks/useAuth';

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [formData, setFormData] = React.useState({
    name: '',
    timezone: '',
    focusGoal: '2',
    preferredFocusTime: 'morning',
    bio: '',
  });
  const { toast } = useToast();

  React.useEffect(() => {
    let mounted = true;
    
    const fetchProfile = async () => {
      if (!user || !mounted) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error || !mounted) return;
        if (data) {
          setFormData({
            name: data.name || '',
            timezone: data.timezone || '',
            focusGoal: data.focus_goal?.toString() || '2',
            preferredFocusTime: data.preferred_focus_time || 'morning',
            bio: data.bio || '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        if (mounted) {
          toast({
            title: 'Error',
            description: 'Failed to load profile data',
            variant: 'destructive',
          });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProfile();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    fetchProfile();

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#a5b9c5] via-[#8da3b0] to-[#6b8795] flex items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setProfileImage(file);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      let profileImageUrl: string | null = null;
      if (profileImage) {
        const fileExt = profileImage.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('profile-images')
          .upload(fileName, profileImage);

        if (uploadError) throw uploadError;
        profileImageUrl = data.path;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: formData.name,
          timezone: formData.timezone,
          focus_goal: parseInt(formData.focusGoal),
          preferred_focus_time: formData.preferredFocusTime,
          bio: formData.bio,
          ...(profileImageUrl && { profile_picture: profileImageUrl }),
          updated_at: new Date().toISOString(),
        });

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#a5b9c5] via-[#8da3b0] to-[#6b8795]">
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10 animate-gradient" />

      <div className="relative h-screen p-6">
        {/* Compact Header */}
        <div className="text-center mb-8 pt-12">
          <h1 className="text-4xl font-light tracking-tight text-white mb-1 animate-fade-in">
            Craft Your Focus Journey
          </h1>
          <p className="text-white/80 text-lg font-light animate-fade-in-delay">
            Personalize your experience to maximize your deep work sessions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto h-[calc(100vh-220px)]">
          {/* Left Column: Profile Basics */}
          <div className="group relative overflow-hidden rounded-2xl bg-[#2a3f4c]/40 backdrop-blur-md border border-white/10 p-6 transition-all duration-300">
            {/* Profile Image Section - More Compact */}
            <div className="relative group mb-6">
              <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-r from-white/20 to-white/10 p-[2px]">
                <div className="relative h-full w-full rounded-full overflow-hidden bg-[#2a3f4c]/60 flex items-center justify-center">
                  {profileImage ? (
                    <img 
                      src={URL.createObjectURL(profileImage)} 
                      alt="Profile" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Icons.user className="h-10 w-10 text-white/40" />
                  )}
                  <div 
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center cursor-pointer backdrop-blur-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Icons.camera className="h-5 w-5 text-white/90" />
                  </div>
                </div>
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-white/80 text-sm font-medium mb-1 block">Full Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/40 focus:border-white/20 transition-all duration-300"
                  placeholder="How should we call you?"
                />
              </div>

              <div>
                <Label className="text-white/80 text-sm font-medium mb-1 block">Bio</Label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full h-24 rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:border-white/20 p-3 text-sm transition-all duration-300 resize-none"
                  placeholder="What drives your focus journey?"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Focus Preferences */}
          <div className="group relative overflow-hidden rounded-2xl bg-[#2a3f4c]/40 backdrop-blur-md border border-white/10 p-6 transition-all duration-300">
            <h2 className="text-lg font-light text-white mb-6 flex items-center gap-2">
              <Icons.target className="h-5 w-5 text-white/90" />
              Focus Preferences
            </h2>

            <div className="space-y-5">
              <div>
                <Label className="text-white/80 text-sm font-medium mb-1 block">Time Zone</Label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full rounded-lg bg-white/10 border border-white/10 text-white p-2 text-sm focus:border-white/20 transition-all duration-300"
                >
                  <option value="" className="bg-[#2a3f4c]">Select your timezone</option>
                  <option value="UTC-8" className="bg-[#2a3f4c]">Pacific Time (PT)</option>
                  <option value="UTC-5" className="bg-[#2a3f4c]">Eastern Time (ET)</option>
                  <option value="UTC+0" className="bg-[#2a3f4c]">UTC</option>
                  <option value="UTC+1" className="bg-[#2a3f4c]">Central European Time (CET)</option>
                </select>
              </div>

              <div>
                <Label className="text-white/80 text-sm font-medium mb-1 block">Daily Focus Goal</Label>
                <div className="grid grid-cols-4 gap-2">
                  {['1', '2', '3', '4'].map((hours) => (
                    <Button
                      key={hours}
                      type="button"
                      variant={formData.focusGoal === hours ? 'default' : 'outline'}
                      className={`border-white/10 transition-all duration-300 py-1 px-2 ${
                        formData.focusGoal === hours 
                          ? 'bg-white/20 text-white border-white/20' 
                          : 'bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                      onClick={() => setFormData({ ...formData, focusGoal: hours })}
                    >
                      {hours}h
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-white/80 text-sm font-medium mb-1 block">Preferred Focus Time</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'morning', label: 'Morning Person', icon: Icons.sunrise },
                    { value: 'evening', label: 'Night Owl', icon: Icons.moon }
                  ].map(({ value, label, icon: Icon }) => (
                    <Button
                      key={value}
                      type="button"
                      variant={formData.preferredFocusTime === value ? 'default' : 'outline'}
                      className={`border-white/10 flex items-center gap-2 transition-all duration-300 py-2 ${
                        formData.preferredFocusTime === value 
                          ? 'bg-white/20 text-white border-white/20' 
                          : 'bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                      onClick={() => setFormData({ ...formData, preferredFocusTime: value })}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Save Profile Button */}
        <div className="absolute bottom-6 right-6">
          <Button
            onClick={onSubmit}
            disabled={isLoading}
            className={`
              relative overflow-hidden group
              bg-gradient-to-r from-[#2a3f4c]/80 to-[#2d4456]/80
              hover:from-[#2a3f4c]/90 hover:to-[#2d4456]/90
              text-white/90 hover:text-white
              border border-white/10 hover:border-white/20
              backdrop-blur-lg
              px-6 py-2.5
              transition-all duration-500 ease-out
              shadow-lg hover:shadow-xl
              disabled:opacity-50 disabled:cursor-not-allowed
              rounded-lg
            `}
          >
            {/* Animated gradient overlay on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Button content with enhanced spacing */}
            <div className="relative flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                  <span className="font-light tracking-wide">Saving...</span>
                </>
              ) : (
                <>
                  <Icons.check className="h-4 w-4" />
                  <span className="font-light tracking-wide">Save Profile</span>
                </>
              )}
            </div>

            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-white/5 blur" />
          </Button>
        </div>
      </div>
    </div>
  );
} 