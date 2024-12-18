import { useState, useEffect } from 'react';
import { Icons } from '../ui/icons';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { supabase } from '../../lib/supabase';

interface ParticipantCardProps {
  participant: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    bio: string;
    current_focus_task?: string;
    preferred_focus_time: string;
    focus_goal: string;
  };
  isCurrentUser: boolean;
  onTaskUpdate: (newTask: string) => void;
}

export function ParticipantCard({ participant, isCurrentUser, onTaskUpdate }: ParticipantCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localTask, setLocalTask] = useState(participant.current_focus_task || '');

  const handleTaskSave = async () => {
    try {
      if (!localTask.trim()) return;

      // First exit edit mode immediately
      setIsEditing(false);

      // Update in Supabase
      const { data, error } = await supabase
        .from('profiles')
        .update({
          current_focus_task: localTask
        })
        .eq('id', participant.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating task:', error);
        setIsEditing(true); // Go back to edit mode if error
        return;
      }

      // Update local state through parent
      onTaskUpdate(localTask);
    } catch (error) {
      console.error('Error in handleTaskSave:', error);
      setIsEditing(true); // Go back to edit mode if error
    }
  };

  // Update local task when participant data changes
  useEffect(() => {
    setLocalTask(participant.current_focus_task || '');
  }, [participant.current_focus_task]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTaskSave();
    }
  };

  return (
    <div className="p-3.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] transition-colors">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400/80 to-blue-500/80">
            {participant.avatar_url ? (
              <img src={participant.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icons.user className="h-5 w-5 text-white/40" />
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white/90 text-sm truncate">
            {participant.full_name}
            {isCurrentUser && <span className="ml-2 text-emerald-400/70">(You)</span>}
          </h3>
          <p className="text-xs text-white/50">{participant.bio}</p>
        </div>
      </div>

      <div className="mt-2.5 pl-[52px]">
        {isEditing ? (
          <div className="flex gap-2">
            <Input
              autoFocus
              value={localTask}
              onChange={(e) => setLocalTask(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 h-7 text-xs text-white bg-black/20 border-white/10"
              placeholder="What are you working on?"
            />
            <Button
              size="sm"
              className="h-7 px-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
              onClick={handleTaskSave}
            >
              <Icons.check className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/90">
              {localTask || "No task set"}
            </p>
            {isCurrentUser && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 hover:bg-white/5"
                onClick={() => setIsEditing(true)}
              >
                <Icons.pencil className="h-3 w-3 text-white/40" />
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Icons.target className="h-3 w-3 text-emerald-500/70" />
          <span className="text-xs text-white/40">
            {participant.focus_goal}h daily goal
          </span>
        </div>
      </div>
    </div>
  );
} 