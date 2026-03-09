import { Room, Client } from '@colyseus/core';
import { GameState, PlayerState, BallState } from '../schema/GameState';
import {
  GRAVITY, BOUNCE_Y, BOUNCE_X, COURT_FLOOR, NET_X, NET_Y,
  PLAYER_SPEED_BASE, JUMP_VELOCITY, P1_MIN_X, P1_MAX_X, P2_MIN_X, P2_MAX_X,
  STAMINA_MAX, STAMINA_LOB_COST, STAMINA_POWER_COST, STAMINA_SIGNATURE_COST,
  RACKET_RANGE, SWING_ZONE_ABOVE, SWING_ZONE_BELOW,
  BALL_OUT_LEFT, BALL_OUT_RIGHT, TICK_RATE, SETS_TO_WIN, GAMES_PER_SET,
  SERVE_RESET_DELAY,
} from '../../../shared/constants';
import { InputEvent, InputAction } from '../../../shared/types';

interface PlayerInputState {
  movingLeft: boolean;
  movingRight: boolean;
  jumping: boolean;
  lastSequence: number;
}

export class TennisRoom extends Room<GameState> {
  private inputStates = new Map<string, PlayerInputState>();
  private ballBounceSide: string = '';
  private ballBounceCount: number = 0;
  private gameLoopInterval: NodeJS.Timeout | null = null;
  private pointPauseTimer: number = 0;
  private isInPointPause: boolean = false;
  private lastPointWinner: string = '';

  // Scoring state (mirrored from schema for logic)
  private p1Points: number = 0;
  private p2Points: number = 0;
  private p1Games: number = 0;
  private p2Games: number = 0;
  private p1Sets: number = 0;
  private p2Sets: number = 0;
  private isDeuce: boolean = false;
  private advantage: number = 0;
  private isTiebreak: boolean = false;
  private tiebreakP1: number = 0;
  private tiebreakP2: number = 0;
  private servingPlayer: string = 'p1';

  onCreate(options: { courtId?: string; characterId?: string; mode?: string }): void {
    this.setState(new GameState());

    this.state.courtId = options.courtId || 'stadium';
    this.state.phase = 'waiting';

    // Set tick rate
    this.setPatchRate(1000 / TICK_RATE);

    // Register message handlers
    this.onMessage('input', (client: Client, data: InputEvent) => {
      this.handleInput(client, data);
    });

    this.onMessage('character_select', (client: Client, data: { characterId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.characterId = data.characterId;
      }
    });

    console.log(`TennisRoom created: ${this.roomId}`);
  }

  onJoin(client: Client, options: { characterId?: string }): void {
    console.log(`Client joined: ${client.sessionId}`);

    const playerCount = this.state.players.size;

    if (playerCount >= 2) {
      throw new Error('Room is full');
    }

    // Create player state
    const player = new PlayerState();
    player.characterId = options?.characterId || 'ace';
    player.sessionIndex = playerCount;
    player.facingRight = playerCount === 0; // P1 faces right, P2 faces left

    if (playerCount === 0) {
      // P1
      player.x = 60;
      player.y = COURT_FLOOR;
      this.state.p1SessionId = client.sessionId;
    } else {
      // P2
      player.x = 260;
      player.y = COURT_FLOOR;
      this.state.p2SessionId = client.sessionId;
    }

    this.state.players.set(client.sessionId, player);

    // Initialize input state
    this.inputStates.set(client.sessionId, {
      movingLeft: false,
      movingRight: false,
      jumping: false,
      lastSequence: -1,
    });

    // If 2 players, start game
    if (this.state.players.size === 2) {
      this.startGame();
    }
  }

  onLeave(client: Client, consented: boolean): void {
    console.log(`Client left: ${client.sessionId} (consented: ${consented})`);

    if (!consented) {
      // Allow reconnection for 30 seconds
      this.allowReconnection(client, 30).then(() => {
        console.log(`Client reconnected: ${client.sessionId}`);
      }).catch(() => {
        // Player failed to reconnect — forfeit
        this.state.players.delete(client.sessionId);
        this.broadcast('player_forfeit', { sessionId: client.sessionId });
        if (this.gameLoopInterval) {
          clearInterval(this.gameLoopInterval);
          this.gameLoopInterval = null;
        }
      });
    } else {
      this.state.players.delete(client.sessionId);
    }

    this.inputStates.delete(client.sessionId);
  }

  onDispose(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
    }
    console.log(`TennisRoom disposed: ${this.roomId}`);
  }

  private startGame(): void {
    this.state.phase = 'countdown';
    this.resetBallForServe();

    // Countdown then play
    setTimeout(() => {
      this.state.phase = 'playing';
      this.startGameLoop();
    }, 3000);
  }

  private startGameLoop(): void {
    const dt = 1 / TICK_RATE;

    this.gameLoopInterval = setInterval(() => {
      this.state.tick++;

      if (this.isInPointPause) {
        this.pointPauseTimer -= dt;
        if (this.pointPauseTimer <= 0) {
          this.isInPointPause = false;
          this.resetBallForServe();
          this.state.phase = 'playing';
        }
        return;
      }

      if (this.state.phase !== 'playing') return;

      this.updatePlayers(dt);
      this.updateBall(dt);
    }, 1000 / TICK_RATE);
  }

  private updatePlayers(dt: number): void {
    this.state.players.forEach((player: PlayerState, sessionId: string) => {
      const input = this.inputStates.get(sessionId);
      if (!input) return;

      const isP1 = player.sessionIndex === 0;
      const minX = isP1 ? P1_MIN_X : P2_MIN_X;
      const maxX = isP1 ? P1_MAX_X : P2_MAX_X;

      // Apply character speed multiplier
      const speedMult = this.getSpeedMult(player.characterId);

      // Horizontal movement
      if (input.movingLeft) {
        player.velocityX = -PLAYER_SPEED_BASE * speedMult;
        player.facingRight = false;
      } else if (input.movingRight) {
        player.velocityX = PLAYER_SPEED_BASE * speedMult;
        player.facingRight = true;
      } else {
        player.velocityX = 0;
      }

      // Jump
      if (input.jumping && player.isGrounded) {
        player.velocityY = JUMP_VELOCITY;
        player.isGrounded = false;
        input.jumping = false; // Consume jump
      }

      // Gravity
      if (!player.isGrounded) {
        player.velocityY += GRAVITY * dt;
      }

      // Move
      player.x += player.velocityX * dt;
      player.y += player.velocityY * dt;

      // Clamp
      player.x = Math.max(minX, Math.min(maxX, player.x));

      // Floor
      if (player.y >= COURT_FLOOR) {
        player.y = COURT_FLOOR;
        player.velocityY = 0;
        player.isGrounded = true;
      }

      // Stamina regen
      const isMoving = Math.abs(player.velocityX) > 1;
      const regenWhileMoving = player.characterId === 'rally';
      if (!isMoving || regenWhileMoving) {
        const rate = this.getStaminaRegen(player.characterId);
        player.stamina = Math.min(STAMINA_MAX, player.stamina + rate * dt);
      }

      // Anim state
      if (player.isSwinging) {
        player.animState = 'swing';
      } else if (!player.isGrounded) {
        player.animState = 'jump';
      } else if (Math.abs(player.velocityX) > 1) {
        player.animState = 'run';
      } else {
        player.animState = 'idle';
      }
    });
  }

  private updateBall(dt: number): void {
    const ball = this.state.ball;
    if (!ball.inPlay) return;

    // Gravity
    ball.velocityY += GRAVITY * dt;

    // Move
    ball.x += ball.velocityX * dt;
    ball.y += ball.velocityY * dt;

    // Floor bounce
    if (ball.y >= COURT_FLOOR) {
      ball.y = COURT_FLOOR;
      ball.velocityY = -Math.abs(ball.velocityY) * BOUNCE_Y;
      ball.velocityX *= BOUNCE_X;

      const side = ball.x < NET_X ? 'p1side' : 'p2side';
      if (side === this.ballBounceSide) {
        this.ballBounceCount++;
      } else {
        this.ballBounceCount = 1;
        this.ballBounceSide = side;
      }

      if (this.ballBounceCount >= 2) {
        const loser = side === 'p1side' ? 'p1' : 'p2';
        const winner = loser === 'p1' ? 'p2' : 'p1';
        this.awardPoint(winner);
        return;
      }

      // Out check
      if (ball.x < BALL_OUT_LEFT) {
        this.awardPoint('p2');
        return;
      }
      if (ball.x > BALL_OUT_RIGHT) {
        this.awardPoint('p1');
        return;
      }
    }

    // Net collision
    const netLeft = NET_X - 1;
    const netRight = NET_X + 1;
    if (ball.x + 3 > netLeft && ball.x - 3 < netRight && ball.y >= NET_Y) {
      const lastHitBy = ball.lastHitBy;
      if (lastHitBy === this.state.p1SessionId) {
        this.awardPoint('p2');
      } else {
        this.awardPoint('p1');
      }
      return;
    }

    // Wall bounds
    if (ball.x < 0) { ball.x = 0; this.awardPoint('p2'); return; }
    if (ball.x > 320) { ball.x = 320; this.awardPoint('p1'); return; }
  }

  private handleInput(client: Client, event: InputEvent): void {
    const player = this.state.players.get(client.sessionId);
    const input = this.inputStates.get(client.sessionId);
    if (!player || !input) return;

    const action = event.action as InputAction;

    switch (action) {
      case 'move_left':
        input.movingLeft = true;
        input.movingRight = false;
        break;
      case 'move_right':
        input.movingRight = true;
        input.movingLeft = false;
        break;
      case 'stop_horizontal':
        input.movingLeft = false;
        input.movingRight = false;
        break;
      case 'jump':
        input.jumping = true;
        break;
      case 'swing_flat':
        this.processSwing(client.sessionId, player, 'flat', event.direction ?? 0);
        break;
      case 'swing_lob':
        this.processSwing(client.sessionId, player, 'lob', event.direction ?? 0);
        break;
      case 'signature_release':
        this.processSwing(client.sessionId, player, 'signature', event.direction ?? 0);
        break;
    }

    input.lastSequence = event.timestamp;
  }

  private processSwing(
    sessionId: string,
    player: PlayerState,
    shotType: string,
    movementDir: number
  ): void {
    const ball = this.state.ball;
    if (!ball.inPlay) return;

    const dx = Math.abs(player.x - ball.x);
    const dy = ball.y - player.y;

    if (dx > RACKET_RANGE || dy < -SWING_ZONE_ABOVE || dy > SWING_ZONE_BELOW) return;

    // Check stamina
    if (shotType === 'lob' && player.stamina < STAMINA_LOB_COST) return;
    if (shotType === 'signature' && player.stamina < STAMINA_SIGNATURE_COST) return;

    // Deduct stamina
    if (shotType === 'lob') player.stamina = Math.max(0, player.stamina - STAMINA_LOB_COST);
    if (shotType === 'signature') player.stamina = Math.max(0, player.stamina - STAMINA_SIGNATURE_COST);

    // Compute hit
    const isP1 = player.sessionIndex === 0;
    const dir = isP1 ? 1 : -1;
    const powerMult = this.getPowerMult(player.characterId);

    let vx = 0;
    let vy = 0;
    let finalType = shotType;

    if (shotType === 'flat') {
      // Auto-upgrade to power on perfect timing
      if (dx <= 8 && player.stamina >= STAMINA_POWER_COST) {
        finalType = 'power';
        player.stamina = Math.max(0, player.stamina - STAMINA_POWER_COST);
        vx = 320 * dir * powerMult;
        vy = movementDir === dir ? -60 : -100;
      } else {
        vx = 220 * dir * powerMult;
        vy = movementDir === dir ? -80 : movementDir === -dir ? -200 : -120;
        if (movementDir === -dir) vx *= 0.4;
      }
    } else if (shotType === 'lob') {
      vx = 80 * dir;
      vy = -280;
    } else if (shotType === 'signature') {
      switch (player.characterId) {
        case 'ace':
          vx = 800 * dir;
          vy = -80;
          break;
        case 'crusher':
          vx = 180 * dir;
          vy = -400;
          break;
        case 'phantom':
          vx = 240 * dir;
          vy = -140;
          break;
        case 'rally':
          vx = 220 * dir;
          vy = -110;
          break;
      }
    }

    ball.velocityX = vx;
    ball.velocityY = vy;
    ball.shotType = finalType;
    ball.lastHitBy = sessionId;
    ball.inPlay = true;
    this.ballBounceSide = isP1 ? 'p1side' : 'p2side';
    this.ballBounceCount = 0;

    player.isSwinging = true;
    setTimeout(() => {
      if (player) player.isSwinging = false;
    }, 300);

    // Broadcast hit event
    this.broadcast('hit', {
      sessionId,
      shotType: finalType,
      quality: dx <= 8 ? 'perfect' : dx <= 14 ? 'good' : 'mishit',
    });
  }

  private awardPoint(winner: string): void {
    if (this.isInPointPause) return;

    const ball = this.state.ball;
    ball.inPlay = false;
    this.isInPointPause = true;
    this.pointPauseTimer = SERVE_RESET_DELAY / 1000;
    this.state.phase = 'point_pause';
    this.lastPointWinner = winner;

    // Update score
    this.advanceScore(winner as 'p1' | 'p2');

    // Broadcast point result
    this.broadcast('point_scored', {
      winner,
      p1Points: this.p1Points,
      p2Points: this.p2Points,
      p1Games: this.p1Games,
      p2Games: this.p2Games,
      p1Sets: this.p1Sets,
      p2Sets: this.p2Sets,
      isDeuce: this.isDeuce,
      advantage: this.advantage,
    });

    if (this.state.score.matchOver) {
      this.state.phase = 'match_end';
      if (this.gameLoopInterval) {
        clearInterval(this.gameLoopInterval);
        this.gameLoopInterval = null;
      }
      this.broadcast('match_end', {
        winner,
        p1Sets: this.p1Sets,
        p2Sets: this.p2Sets,
      });
    }
  }

  private advanceScore(winner: 'p1' | 'p2'): void {
    if (this.isTiebreak) {
      if (winner === 'p1') this.tiebreakP1++;
      else this.tiebreakP2++;

      if (this.tiebreakP1 >= 7 && this.tiebreakP1 - this.tiebreakP2 >= 2) {
        this.awardGame('p1');
        this.isTiebreak = false;
        this.tiebreakP1 = 0;
        this.tiebreakP2 = 0;
      } else if (this.tiebreakP2 >= 7 && this.tiebreakP2 - this.tiebreakP1 >= 2) {
        this.awardGame('p2');
        this.isTiebreak = false;
        this.tiebreakP1 = 0;
        this.tiebreakP2 = 0;
      }
      this.syncScore();
      return;
    }

    if (this.isDeuce) {
      if (this.advantage === 0) {
        this.advantage = winner === 'p1' ? 1 : -1;
      } else if ((winner === 'p1' && this.advantage === 1) || (winner === 'p2' && this.advantage === -1)) {
        this.awardGame(winner);
      } else {
        this.advantage = 0;
      }
    } else {
      if (winner === 'p1') this.p1Points++;
      else this.p2Points++;

      if (this.p1Points >= 3 && this.p2Points >= 3) {
        this.isDeuce = true;
        this.p1Points = 3;
        this.p2Points = 3;
      } else if (this.p1Points >= 4) {
        this.awardGame('p1');
      } else if (this.p2Points >= 4) {
        this.awardGame('p2');
      }
    }

    this.syncScore();
  }

  private awardGame(winner: 'p1' | 'p2'): void {
    this.p1Points = 0;
    this.p2Points = 0;
    this.isDeuce = false;
    this.advantage = 0;

    if (winner === 'p1') this.p1Games++;
    else this.p2Games++;

    // Switch server
    this.servingPlayer = this.servingPlayer === 'p1' ? 'p2' : 'p1';

    // Check tiebreak
    if (this.p1Games === GAMES_PER_SET && this.p2Games === GAMES_PER_SET) {
      this.isTiebreak = true;
      return;
    }

    // Check set win
    const p1WinsSet = this.p1Games >= GAMES_PER_SET && this.p1Games - this.p2Games >= 2;
    const p2WinsSet = this.p2Games >= GAMES_PER_SET && this.p2Games - this.p1Games >= 2;

    if (p1WinsSet) {
      this.p1Sets++;
      this.resetForNewSet();
      this.checkMatchEnd();
    } else if (p2WinsSet) {
      this.p2Sets++;
      this.resetForNewSet();
      this.checkMatchEnd();
    }
  }

  private resetForNewSet(): void {
    this.p1Games = 0;
    this.p2Games = 0;
    this.p1Points = 0;
    this.p2Points = 0;
    this.isDeuce = false;
    this.advantage = 0;
    this.isTiebreak = false;
    this.tiebreakP1 = 0;
    this.tiebreakP2 = 0;
  }

  private checkMatchEnd(): void {
    if (this.p1Sets >= SETS_TO_WIN) {
      this.state.score.matchOver = true;
      this.state.score.matchWinner = 'p1';
    } else if (this.p2Sets >= SETS_TO_WIN) {
      this.state.score.matchOver = true;
      this.state.score.matchWinner = 'p2';
    }
  }

  private syncScore(): void {
    const s = this.state.score;
    s.p1Points = this.p1Points;
    s.p2Points = this.p2Points;
    s.p1Games = this.p1Games;
    s.p2Games = this.p2Games;
    s.p1Sets = this.p1Sets;
    s.p2Sets = this.p2Sets;
    s.isDeuce = this.isDeuce;
    s.advantage = this.advantage;
    s.server = this.servingPlayer;
    s.isTiebreak = this.isTiebreak;
    s.tiebreakP1 = this.tiebreakP1;
    s.tiebreakP2 = this.tiebreakP2;
  }

  private resetBallForServe(): void {
    const ball = this.state.ball;
    ball.inPlay = false;
    ball.x = this.servingPlayer === 'p1' ? 60 : 260;
    ball.y = COURT_FLOOR - 30;
    ball.velocityX = 0;
    ball.velocityY = 0;
    ball.bounceCount = 0;
    ball.lastHitBy = '';
    this.ballBounceSide = '';
    this.ballBounceCount = 0;
  }

  private getSpeedMult(characterId: string): number {
    switch (characterId) {
      case 'ace': return 1.25;
      case 'phantom': return 1.1;
      default: return 1.0;
    }
  }

  private getPowerMult(characterId: string): number {
    switch (characterId) {
      case 'crusher': return 1.15;
      default: return 1.0;
    }
  }

  private getStaminaRegen(characterId: string): number {
    switch (characterId) {
      case 'ace': return 8;
      case 'crusher': return 5;
      case 'phantom': return 10;
      case 'rally': return 15;
      default: return 8;
    }
  }
}
