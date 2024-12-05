import { useEffect, useCallback } from 'react';
import { WebSocketManager } from '../lib/managers/WebSocketManager';
import { WebSocketMessage } from '../lib/services/websocketService';

export function useWebSocket(roomId: string, onMessage: (message: WebSocketMessage) => void) {
  const sendMessage = useCallback((message: WebSocketMessage) => {
    WebSocketManager.getInstance().sendMessage(roomId, message);
  }, [roomId]);

  useEffect(() => {
    const cleanup = WebSocketManager.getInstance().subscribeToRoom(roomId, onMessage);
    return cleanup;
  }, [roomId, onMessage]);

  return { sendMessage };
} 