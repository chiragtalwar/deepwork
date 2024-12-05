import { supabase } from '../supabase';

export interface WebSocketMessage {
  type: 'user_joined' | 'user_left' | 'focus_changed' | 'timer_sync';
  payload: any;
}

export const websocketService = {
  subscribeToRoom(roomId: string, onMessage: (message: WebSocketMessage) => void) {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        onMessage(payload as WebSocketMessage);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  sendMessage(roomId: string, message: WebSocketMessage) {
    return supabase
      .channel(`room:${roomId}`)
      .send({
        type: 'broadcast',
        event: 'message',
        payload: message,
      });
  },
}; 