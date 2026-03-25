import { ClientCommand, ServerMessage } from '../types/ws-protocol';
import { handleServerMessage } from './messageHandler';
import { useSimulationStore } from '../store/simulationStore';

const WS_BASE = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8000';

// Reconnect strategy: 1s, 2s, 4s, 8s, 16s (capped)
const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000];

class WsClient {
  private socket: WebSocket | null = null;
  private sessionId: string | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  connect(sessionId: string): void {
    if (this.socket) this.disconnect();
    this.sessionId = sessionId;
    this.intentionalClose = false;
    this.reconnectAttempt = 0;
    this._open(sessionId);
  }

  private _open(sessionId: string): void {
    const socket = new WebSocket(`${WS_BASE}/ws/simulation/${sessionId}`);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempt = 0;
      useSimulationStore.getState().setConnectionStatus('connected');
    };

    socket.onmessage = (ev) => {
      try {
        const msg: ServerMessage = JSON.parse(ev.data as string);
        handleServerMessage(msg);
      } catch {
        console.error('[WsClient] Failed to parse message', ev.data);
      }
    };

    socket.onclose = () => {
      if (this.intentionalClose) return;
      useSimulationStore.getState().setConnectionStatus('reconnecting');
      this._scheduleReconnect();
    };

    socket.onerror = () => {
      // onclose fires after onerror — reconnect logic handled there
      useSimulationStore.getState().setConnectionStatus('error');
    };
  }

  private _scheduleReconnect(): void {
    if (!this.sessionId) return;
    const delay = BACKOFF_MS[Math.min(this.reconnectAttempt, BACKOFF_MS.length - 1)];
    this.reconnectAttempt++;
    console.info(`[WsClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);
    this.reconnectTimer = setTimeout(() => {
      if (this.sessionId) this._open(this.sessionId);
    }, delay);
  }

  send(cmd: ClientCommand): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[WsClient] Cannot send — socket not open');
      return;
    }
    this.socket.send(JSON.stringify(cmd));
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
    this.sessionId = null;
    useSimulationStore.getState().setConnectionStatus('disconnected');
  }

  get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  get currentSessionId(): string | null {
    return this.sessionId;
  }
}

export const wsClient = new WsClient();
