import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rewardService, type Badge } from '@/lib/services/rewardService';
import { Icons } from '@/components/ui/icons';

export function BadgeGrid() {
  const [badges, setBadges] = React.useState<Badge[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      const userBadges = await rewardService.getUserBadges();
      setBadges(userBadges.map(ub => ub.badge));
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Badges</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center">
            <Icons.spinner className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="flex flex-col items-center p-4 border rounded-lg"
              >
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-2">
                  {badge.icon_url ? (
                    <img
                      src={badge.icon_url}
                      alt={badge.name}
                      className="w-10 h-10"
                    />
                  ) : (
                    <Icons.trophy className="w-8 h-8 text-yellow-500" />
                  )}
                </div>
                <h3 className="font-medium text-center">{badge.name}</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {badge.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 