import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rewardService, type Theme } from '@/lib/services/rewardService';
import { Button } from "@/components/ui/button";
import { Icons } from '@/components/ui/icons';

export function ThemeSelector() {
  const [themes, setThemes] = React.useState<Theme[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeThemeId, setActiveThemeId] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    try {
      const userThemes = await rewardService.getUserThemes();
      setThemes(userThemes.map(ut => ({
        ...ut.theme,
        isActive: ut.is_active,
      })));
      const activeTheme = userThemes.find(ut => ut.is_active);
      if (activeTheme) {
        setActiveThemeId(activeTheme.theme_id);
      }
    } catch (error) {
      console.error('Error loading themes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = async (themeId: string) => {
    try {
      await rewardService.setActiveTheme(themeId);
      setActiveThemeId(themeId);
      const theme = themes.find(t => t.id === themeId);
      if (theme) {
        applyTheme(theme.css_variables);
      }
    } catch (error) {
      console.error('Error changing theme:', error);
    }
  };

  const applyTheme = (variables: Record<string, string>) => {
    const root = document.documentElement;
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Settings</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center">
            <Icons.spinner className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className="relative p-4 border rounded-lg"
              >
                <div 
                  className="w-full h-24 rounded-md mb-4"
                  style={{
                    background: `hsl(${theme.css_variables['--background']})`,
                    border: '1px solid hsl(var(--border))'
                  }}
                />
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{theme.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {theme.description}
                    </p>
                  </div>
                  <Button
                    variant={activeThemeId === theme.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleThemeChange(theme.id)}
                    disabled={activeThemeId === theme.id}
                  >
                    {activeThemeId === theme.id ? 'Active' : 'Apply'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 