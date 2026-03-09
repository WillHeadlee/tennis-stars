import {
  GRAVITY,
  COURT_FLOOR,
  COURT_WIDTH,
  NET_X,
  NET_Y,
  NET_HEIGHT,
  BOUNCE_Y,
  BOUNCE_X,
  BALL_OUT_LEFT,
  BALL_OUT_RIGHT,
  NET_CORD_CLIP_CHANCE,
} from '@shared/constants';

export interface BallPhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export type BounceResult = 'none' | 'floor' | 'net_blocked' | 'net_clip' | 'out_left' | 'out_right';

/**
 * Predict where the ball will land on the court floor (for AI).
 * Uses parabolic extrapolation stepping at 60fps.
 */
export function predictLanding(ball: BallPhysicsState): { x: number; y: number } | null {
  let { x, y, vx, vy } = ball;
  const dt = 1 / 60;
  let iterations = 0;
  const MAX_ITER = 600; // 10 seconds max

  while (x > 0 && x < COURT_WIDTH && iterations < MAX_ITER) {
    vy += GRAVITY * dt;
    x += vx * dt;
    y += vy * dt;
    iterations++;

    if (y >= COURT_FLOOR) {
      return { x, y: COURT_FLOOR };
    }
  }
  return null;
}

/**
 * Step ball physics by dt seconds.
 * Returns the bounce/collision result.
 */
export function stepBall(ball: BallPhysicsState, dt: number): BounceResult {
  ball.vy += GRAVITY * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Floor bounce
  if (ball.y >= COURT_FLOOR) {
    ball.y = COURT_FLOOR;
    ball.vy = -Math.abs(ball.vy) * BOUNCE_Y;
    ball.vx *= BOUNCE_X;

    // Check if ball went out of bounds on floor
    if (ball.x < BALL_OUT_LEFT) return 'out_left';
    if (ball.x > BALL_OUT_RIGHT) return 'out_right';

    return 'floor';
  }

  // Net collision check
  const ballRadius = 3;
  const netLeft = NET_X - 1;
  const netRight = NET_X + 1;

  if (ball.x + ballRadius > netLeft && ball.x - ballRadius < netRight) {
    if (ball.y >= NET_Y) {
      // Ball at net level — check cord
      const hitTopPixels = Math.abs(ball.y - NET_Y) < 2;
      if (hitTopPixels) {
        // Net cord: 30% clip over
        if (Math.random() < NET_CORD_CLIP_CHANCE) {
          // Clip over — small upward bump
          ball.vy = -40;
          return 'net_clip';
        } else {
          // Blocked by net
          ball.vx = -ball.vx * 0.3;
          ball.vy = -Math.abs(ball.vy) * 0.3;
          return 'net_blocked';
        }
      } else {
        // Solid net hit
        ball.vx = -ball.vx * 0.3;
        ball.vy = Math.abs(ball.vy) * 0.3;
        return 'net_blocked';
      }
    }
  }

  // Wall bounce (keep ball in court width-wise loosely)
  if (ball.x < 0) {
    ball.x = 0;
    ball.vx = Math.abs(ball.vx);
    return 'out_left';
  }
  if (ball.x > COURT_WIDTH) {
    ball.x = COURT_WIDTH;
    ball.vx = -Math.abs(ball.vx);
    return 'out_right';
  }

  return 'none';
}

/**
 * Calculate shot velocity based on swing context.
 */
export function calcShotVelocity(
  shooterX: number,
  targetSideRight: boolean,
  movementDir: number, // -1, 0, 1
  shotType: 'flat' | 'lob' | 'power',
  powerMult: number = 1.0
): { vx: number; vy: number } {
  const dirToTarget = targetSideRight ? 1 : -1;

  let speed = 200;
  let vyBase = -120;

  if (shotType === 'flat') {
    speed = 220 * powerMult;
    vyBase = movementDir === dirToTarget ? -80 : movementDir === -dirToTarget ? -160 : -120;
  } else if (shotType === 'lob') {
    speed = 80 * powerMult;
    vyBase = -280;
  } else if (shotType === 'power') {
    speed = 320 * powerMult;
    vyBase = movementDir === dirToTarget ? -60 : -100;
  }

  // Drop shot if running away from net
  if (movementDir === -dirToTarget && shotType === 'flat') {
    speed = 90;
    vyBase = -200;
  }

  return {
    vx: speed * dirToTarget,
    vy: vyBase,
  };
}

/**
 * Apply topspin — increases vy after peak (simulated by boosting gravity factor).
 * Called once on hit, returns modified vy.
 */
export function applyTopspin(vy: number): number {
  return vy * 0.85; // Less initial upward force → dips faster
}

/**
 * Apply slice — ball stays low on bounce (reduces BOUNCE_Y effect).
 * Returns a modified bounce coefficient.
 */
export function getSliceBounce(): number {
  return BOUNCE_Y * 0.5;
}

/**
 * Check if a player can reach the ball (within racket range and swing zone).
 */
export function canHit(
  playerX: number,
  playerY: number,
  ballX: number,
  ballY: number,
  racketRange: number = 20,
  zoneAbove: number = 30,
  zoneBelow: number = 10
): boolean {
  const dx = Math.abs(playerX - ballX);
  const dy = ballY - playerY; // positive = ball is below player center

  return dx <= racketRange && dy >= -zoneAbove && dy <= zoneBelow;
}
