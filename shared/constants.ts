// Tennis Stars — Shared Constants
// Used by both client (Phaser) and server (Colyseus)

export const GRAVITY = 1200;          // px/s² — player gravity only
export const BALL_GRAVITY = 400;      // px/s² — ball gravity (lower for playable arcs)
export const BOUNCE_Y = 0.65;        // Vertical velocity retained on bounce
export const BOUNCE_X = 0.90;        // Horizontal velocity retained on bounce

export const COURT_WIDTH = 320;
export const COURT_HEIGHT = 180;
export const NET_X = 160;
export const NET_HEIGHT = 22;         // Native pixels tall
export const NET_Y = 126;            // Top of net (COURT_FLOOR - NET_HEIGHT)
export const COURT_FLOOR = 148;      // Native pixels from top

export const BALL_RADIUS = 3;
export const BALL_OUT_LEFT = 10;
export const BALL_OUT_RIGHT = 310;

// Player boundaries
export const P1_MIN_X = 20;
export const P1_MAX_X = 155;
export const P2_MIN_X = 165;
export const P2_MAX_X = 300;

// Player physics
export const PLAYER_SPEED_BASE = 80;  // px/s
export const JUMP_VELOCITY = -360;    // px/s
export const PLAYER_WIDTH = 12;
export const PLAYER_HEIGHT = 24;

// Stamina
export const STAMINA_MAX = 100;
export const STAMINA_REGEN_IDLE = 8;  // per second
export const STAMINA_REGEN_MOVING = 0; // per second (for most characters)
export const STAMINA_LOB_COST = 5;
export const STAMINA_POWER_COST = 20;
export const STAMINA_SIGNATURE_COST = 50;

// Hit detection
export const RACKET_RANGE = 20;        // px from ball center
export const SWING_ZONE_ABOVE = 30;    // px above player center
export const SWING_ZONE_BELOW = 10;    // px below player center

// Timing windows (ms)
export const TIMING_PERFECT = 80;
export const TIMING_GOOD = 160;

// Shot speeds
export const SHOT_SPEED_FLAT = 220;   // px/s
export const SHOT_SPEED_LOB_X = 80;
export const SHOT_SPEED_LOB_Y = -280;
export const SHOT_SPEED_POWER = 320;
export const SHOT_SPEED_SIGNATURE_MULT = 2.5;

// Serving
export const SERVE_HEIGHT = 60;       // y position for serve toss
export const SERVE_RESET_DELAY = 1500; // ms after point

// Network
export const TICK_RATE = 20;          // Server ticks per second
export const SERVER_PORT = 2567;
export const RECONNECT_TIMEOUT = 30000; // 30s

// AI reaction delays (ms)
export const AI_DELAY_EASY = 500;
export const AI_DELAY_MEDIUM = 220;
export const AI_DELAY_HARD = 60;
export const AI_SIGNATURE_STAMINA_HARD = 60;
export const AI_POWER_STAMINA_MEDIUM = 40;

// Scoring
export const GAMES_PER_SET = 6;
export const SETS_TO_WIN = 2;         // Best of 3
export const TIEBREAK_POINTS = 7;

// Game feel
export const SCREENSHAKE_FRAMES = 6;
export const SCREENSHAKE_AMOUNT = 2;
export const HIT_FREEZE_FRAMES = 3;
export const BALL_TRAIL_LENGTH = 4;
export const POWER_TRAIL_LENGTH = 8;
export const DUST_PARTICLE_COUNT = 4;
export const SLOW_MO_SCALE = 0.5;
export const SLOW_MO_DURATION = 1000; // ms

// Net cord probabilities
export const NET_CORD_CLIP_CHANCE = 0.3;

// Starting ELO
export const ELO_START = 1000;
