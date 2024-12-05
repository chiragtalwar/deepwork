import { websocketService, WebSocketMessage } from '../services/websocketService';

export class WebSocketManager {
  private static instance: WebSocketManager;
  private handlers: Map<string, Set<(message: WebSocketMessage) => void>>;
  private cleanup: Map<string, () => void>;

  private constructor() {
    this.handlers = new Map();
    this.cleanup = new Map();
  }

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  subscribeToRoom(roomId: string, handler: (message: WebSocketMessage) => void) {
    if (!this.handlers.has(roomId)) {
      this.handlers.set(roomId, new Set());
      const cleanup = websocketService.subscribeToRoom(roomId, (message) => {
        this.handlers.get(roomId)?.forEach(h => h(message));
      });
      this.cleanup.set(roomId, cleanup);
    }
    this.handlers.get(roomId)?.add(handler);

    return () => {
      const handlers = this.handlers.get(roomId);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.cleanup.get(roomId)?.();
          this.handlers.delete(roomId);
          this.cleanup.delete(roomId);
        }
      }
    };
  }

  sendMessage(roomId: string, message: WebSocketMessage) {
    return websocketService.sendMessage(roomId, message);
  }
} 