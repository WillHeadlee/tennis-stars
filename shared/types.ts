// Tennis Stars — Shared Types
// Used by both client and server

export type CharacterId = 'ace' | 'crusher' | 'phantom' | 'rally';

export type ShotType = 'flat' | 'lob' | 'power' | 'signature';

export type AnimState = 'idle' | 'run' | 'jump' | 'swing' | 'celebrate' | 'hurt' | 'charge';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type AIState = 'idle' | 'chase_ball' | 'position' | 'swing' | 'recover';

export type RoomPhase =
  | 'waiting'
  | 'character_select'
  | 'countdown'
  | 'playing'
  | 'point_pause'
  | 'set_end'
  | 'match_end'
  | 'results';

export type CourtId = 'stadium' | 'night' | 'ruins';

export type GameMode = 'online' | 'local' | 'ai' | 'practice';

export type TimingQuality = 'perfect' | 'good' | 'mishit';

// Input event sent from client to server
export interface InputEvent {
  action: InputAction;
  timestamp: number;
  direction?: number; // -1 | 0 | 1
  playerId: string;
}

export type InputAction =
  | 'move_left'
  | 'move_right'
  | 'stop_horizontal'
  | 'jump'
  | 'swing_flat'
  | 'swing_lob'
  | 'signature_start'
  | 'signature_release'
  | 'charge_start'
  | 'charge_release';

// Network messages
export interface JoinMessage {
  characterId: CharacterId;
  courtId: CourtId;
  mode: GameMode;
  roomCode?: string;
}

export interface CharSelectMessage {
  characterId: CharacterId;
}

export interface HitResult {
  playerId: string;
  quality: TimingQuality;
  shotType: ShotType;
  ballVx: number;
  ballVy: number;
}

export interface PointResult {
  winner: 'p1' | 'p2';
  reason: 'out' | 'net' | 'double_bounce' | 'fault';
  p1Points: number;
  p2Points: number;
  p1Games: number;
  p2Games: number;
  p1Sets: number;
  p2Sets: number;
  isDeuce: boolean;
  advantage: -1 | 0 | 1;
}

export interface MatchResult {
  winner: 'p1' | 'p2';
  p1Sets: number;
  p2Sets: number;
  p1ELODelta?: number;
  p2ELODelta?: number;
}

// Character stat block
export interface CharacterStats {
  id: CharacterId;
  name: string;
  speed: number;       // 1-5
  power: number;       // 1-5
  staminaRegen: number; // 1-5
  speedMultiplier: number;  // movement speed modifier
  powerMultiplier: number;  // shot speed modifier
  regenRate: number;        // stamina/second at idle
  regenWhileMoving: boolean;
  color: number;            // Primary hex color
  accentColor: number;      // Secondary hex color
  description: string;
}

// Court data
export interface CourtData {
  id: CourtId;
  name: string;
  floorColor: number;
  bgColor: number;
  netColor: number;
  ballSpeedMod: number;   // multiplier
  bounceHeightMod: number; // multiplier on BOUNCE_Y
  unlocked: boolean;
}

// Serializable player state (for server schema)
export interface PlayerStateData {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  stamina: number;
  animState: AnimState;
  isCharging: boolean;
  characterId: CharacterId;
  isGrounded: boolean;
  facingRight: boolean;
}

// Serializable ball state
export interface BallStateData {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  shotType: ShotType;
  lastHitBy: string;
  bounceCount: number;
  inPlay: boolean;
}

// Score state
export interface ScoreStateData {
  p1Points: number;  // 0-3 (maps to 0/15/30/40), 4 = advantage
  p2Points: number;
  p1Games: number;
  p2Games: number;
  p1Sets: number;
  p2Sets: number;
  isDeuce: boolean;
  advantage: -1 | 0 | 1;
  server: 'p1' | 'p2';
}

// Full game state snapshot
export interface GameStateData {
  phase: RoomPhase;
  p1: PlayerStateData;
  p2: PlayerStateData;
  ball: BallStateData;
  score: ScoreStateData;
  courtId: CourtId;
  tick: number;
}
