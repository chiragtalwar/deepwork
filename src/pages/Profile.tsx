import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Icons } from '../components/ui/icons';
import { supabase } from '../lib/supabase';
import { useToast } from "../components/ui/use-toast";

export default function Profile() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [profileImage, setProfileImage] = React.useState<File | null>(null);
  const [formData, setFormData] = React.useState({
    name: '',
    timezone: '',
  });
  const { toast } = useToast();

  React.useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          if (data) {
            setFormData({
              name: data.name || '',
              timezone: data.timezone || '',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive',
        });
      }
    }
    fetchProfile();
  }, []);

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setProfileImage(file);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      let profileImageUrl = null;
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
          profile_picture: profileImageUrl,
          updated_at: new Date().toISOString(),
        });

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container max-w-lg mx-auto px-4 py-8">
      <Card className="bg-gradient-to-r from-purple-500 to-indigo-500 shadow-xl transform hover:scale-105 transition-transform duration-300">
        <CardHeader>
          <CardTitle className="text-4xl font-bold text-white text-center">Your Magical Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                required
                disabled={isLoading}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white text-black"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-white">Time Zone</Label>
              <select
                id="timezone"
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black"
                required
                disabled={isLoading}
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              >
                <option value="">Select your timezone</option>
                <option value="UTC-8">Pacific Time (PT)</option>
                <option value="UTC-5">Eastern Time (ET)</option>
                <option value="UTC+0">UTC</option>
                <option value="UTC+1">Central European Time (CET)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Profile Picture</Label>
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-lg">
                  {profileImage ? (
                    <img src={URL.createObjectURL(profileImage)} alt="Profile" className="h-16 w-16 rounded-full" />
                  ) : (
                    <Icons.user className="h-8 w-8 text-gray-500" />
                  )}
                </div>
                <Button type="button" variant="outline" disabled={isLoading} className="text-white border-white">
                  Upload Photo
                </Button>
                <Input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isLoading}
                  className="hidden"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200" disabled={isLoading}>
              {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Complete Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 