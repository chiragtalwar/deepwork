import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { settingsService, type UserSettings } from '@/lib/services/settingsService';

export function UserPreferences() {
  const [settings, setSettings] = React.useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.getUserSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationChange = async (key: keyof UserSettings['notification_preferences']) => {
    if (!settings) return;
    
    try {
      const newPreferences = {
        ...settings.notification_preferences,
        [key]: !settings.notification_preferences[key],
      };
      
      await settingsService.updateNotificationPreferences(newPreferences);
      setSettings({
        ...settings,
        notification_preferences: newPreferences,
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  };

  const handleSessionDurationChange = async (duration: string) => {
    if (!settings) return;

    try {
      const newPreferences = {
        ...settings.session_preferences,
        default_duration: parseInt(duration),
      };

      await settingsService.updateSessionPreferences(newPreferences);
      setSettings({
        ...settings,
        session_preferences: newPreferences,
      });
    } catch (error) {
      console.error('Error updating session preferences:', error);
    }
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  if (!settings) {
    return <div>Error loading settings</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications">Email Notifications</Label>
            <Switch
              id="email-notifications"
              checked={settings.notification_preferences.email}
              onCheckedChange={() => handleNotificationChange('email')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="push-notifications">Push Notifications</Label>
            <Switch
              id="push-notifications"
              checked={settings.notification_preferences.push}
              onCheckedChange={() => handleNotificationChange('push')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sound-notifications">Sound Notifications</Label>
            <Switch
              id="sound-notifications"
              checked={settings.notification_preferences.sound}
              onCheckedChange={() => handleNotificationChange('sound')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-duration">Default Session Duration</Label>
            <Select
              value={settings.session_preferences.default_duration.toString()}
              onValueChange={handleSessionDurationChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1800">30 minutes</SelectItem>
                <SelectItem value="3600">1 hour</SelectItem>
                <SelectItem value="5400">1.5 hours</SelectItem>
                <SelectItem value="7200">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 