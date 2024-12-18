import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Icons } from '../ui/icons'

interface Participant {
  id: string;
  name: string;
  isFocused: boolean;
}

export function ParticipantList() {
  const participants: Participant[] = [
    { id: '1', name: 'You', isFocused: true },
  ];

  return (
    <Card className="backdrop-blur-md bg-white/[0.08] border border-white/[0.08]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white/90">
          <Icons.user className="h-5 w-5" />
          Participants ({participants.length}/5)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.03]"
            >
              <span className="text-white/80">{participant.name}</span>
              {participant.isFocused ? (
                <Icons.user className="h-4 w-4 text-green-400" />
              ) : (
                <Icons.user className="h-4 w-4 text-yellow-400" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 