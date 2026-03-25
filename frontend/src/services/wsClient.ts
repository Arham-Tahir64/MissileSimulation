import { ClientCommand, ServerMessage } from '../types/ws-protocol';
import { handleServerMessage } from './messageHandler';

const WS_BASE = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8000';

class WsClient {
  private socket: WebSocket | null = null;
  private sessionId: string | null = null;

  connect(sessionId: string): void {
    if (this.socket) this.disconnect();
    this.sessionId = sessionId;
    this.socket = new WebSocket(`${WS_BASE}/ws/simulation/${sessionId}`);

    this.socket.onmessage = (ev) => {
      try {
        const msg: ServerMessage = JSON.parse(ev.data as string);
        handleServerMessage(msg);
      } catch {
        console.error('[WsClient] Failed to parse message', ev.data);
      }
    };

    this.socket.onclose = () => {
      console.info('[WsClient] Connection closed');
    };

    this.socket.onerror = (err) => {
      console.error('[WsClient] WebSocket error', err);
    };
  }

  send(cmd: ClientCommand): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[WsClient] Cannot send — socket not open');
      return;
    }
    this.socket.send(JSON.stringify(cmd));
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.sessionId = null;
  }

  get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  get currentSessionId(): string | null {
    return this.sessionId;
  }
}

// Singleton
export const wsClient = new WsClient();
