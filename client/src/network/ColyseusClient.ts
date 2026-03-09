import { Client, Room } from 'colyseus.js';
import { CharacterId, CourtId, GameMode, InputEvent, InputAction } from '@shared/types';
import { SERVER_PORT } from '@shared/constants';

const SERVER_URL = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SERVER_URL
  || `ws://localhost:${SERVER_PORT}`;

export interface RoomEventHandlers {
  onStateChange?: (state: unknown) => void;
  onMessage?: (type: string, data: unknown) => void;
  onLeave?: (code: number) => void;
  onError?: (code: number, message: string) => void;
}

export class ColyseusClientManager {
  private client: Client;
  private room: Room | null = null;
  private handlers: RoomEventHandlers = {};
  private connected: boolean = false;

  constructor() {
    this.client = new Client(SERVER_URL);
  }

  isConnected(): boolean {
    return this.connected && this.room !== null;
  }

  getRoomId(): string {
    return this.room?.roomId ?? '';
  }

  getSessionId(): string {
    return this.room?.sessionId ?? '';
  }

  setHandlers(handlers: RoomEventHandlers): void {
    this.handlers = handlers;
  }

  /**
   * Create a new game room (host).
   */
  async createRoom(
    characterId: CharacterId,
    courtId: CourtId,
    mode: GameMode
  ): Promise<string> {
    try {
      this.room = await this.client.create('tennis_room', {
        characterId,
        courtId,
        mode,
      });
      this.connected = true;
      this.bindRoomEvents();
      return this.room.roomId;
    } catch (err) {
      console.error('Failed to create room:', err);
      throw err;
    }
  }

  /**
   * Join an existing room by room code.
   */
  async joinRoom(
    roomCode: string,
    characterId: CharacterId,
    courtId: CourtId
  ): Promise<void> {
    try {
      this.room = await this.client.joinById(roomCode, {
        characterId,
        courtId,
      });
      this.connected = true;
      this.bindRoomEvents();
    } catch (err) {
      console.error('Failed to join room:', err);
      throw err;
    }
  }

  /**
   * Join matchmaking queue (random opponent).
   */
  async joinQueue(characterId: CharacterId, courtId: CourtId): Promise<void> {
    try {
      this.room = await this.client.joinOrCreate('tennis_room', {
        characterId,
        courtId,
        matchmaking: true,
      });
      this.connected = true;
      this.bindRoomEvents();
    } catch (err) {
      console.error('Failed to join matchmaking:', err);
      throw err;
    }
  }

  /**
   * Send an input event to the server.
   */
  sendInput(action: InputAction, direction?: number): void {
    if (!this.room) return;
    const event: InputEvent = {
      action,
      timestamp: Date.now(),
      direction: direction ?? 0,
      playerId: this.room.sessionId,
    };
    this.room.send('input', event);
  }

  /**
   * Send a generic message to the server.
   */
  sendMessage(type: string, data: unknown): void {
    if (!this.room) return;
    this.room.send(type, data);
  }

  /**
   * Leave the current room.
   */
  async leave(): Promise<void> {
    if (this.room) {
      await this.room.leave();
      this.room = null;
      this.connected = false;
    }
  }

  private bindRoomEvents(): void {
    if (!this.room) return;

    this.room.onStateChange((state) => {
      this.handlers.onStateChange?.(state);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.room as any).onMessage('*', (type: string | number, message: unknown) => {
      this.handlers.onMessage?.(String(type), message);
    });

    this.room.onLeave((code: number) => {
      this.connected = false;
      this.handlers.onLeave?.(code);
    });

    this.room.onError((code: number, message?: string) => {
      this.handlers.onError?.(code, message ?? '');
    });
  }
}

// Singleton instance
export const colyseusClient = new ColyseusClientManager();
