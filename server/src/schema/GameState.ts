import { Schema, type, MapSchema } from '@colyseus/schema';

export class PlayerState extends Schema {
  @type('float32') x: number = 0;
  @type('float32') y: number = 0;
  @type('float32') velocityX: number = 0;
  @type('float32') velocityY: number = 0;
  @type('uint8')   stamina: number = 100;
  @type('string')  animState: string = 'idle';
  @type('boolean') isCharging: boolean = false;
  @type('string')  characterId: string = 'ace';
  @type('boolean') isGrounded: boolean = true;
  @type('boolean') facingRight: boolean = true;
  @type('boolean') isSwinging: boolean = false;
  @type('uint8')   sessionIndex: number = 0; // 0 = P1, 1 = P2
}

export class BallState extends Schema {
  @type('float32') x: number = 160;
  @type('float32') y: number = 100;
  @type('float32') velocityX: number = 0;
  @type('float32') velocityY: number = 0;
  @type('string')  shotType: string = 'flat';
  @type('string')  lastHitBy: string = '';
  @type('boolean') inPlay: boolean = false;
  @type('uint8')   bounceCount: number = 0;
}

export class ScoreState extends Schema {
  @type('uint8')   p1Points: number = 0;
  @type('uint8')   p2Points: number = 0;
  @type('uint8')   p1Games: number = 0;
  @type('uint8')   p2Games: number = 0;
  @type('uint8')   p1Sets: number = 0;
  @type('uint8')   p2Sets: number = 0;
  @type('boolean') isDeuce: boolean = false;
  @type('int8')    advantage: number = 0;
  @type('string')  server: string = 'p1';
  @type('boolean') matchOver: boolean = false;
  @type('string')  matchWinner: string = '';
  @type('boolean') isTiebreak: boolean = false;
  @type('uint8')   tiebreakP1: number = 0;
  @type('uint8')   tiebreakP2: number = 0;
}

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type(BallState) ball = new BallState();
  @type(ScoreState) score = new ScoreState();
  @type('string') phase: string = 'waiting';
  @type('string') courtId: string = 'stadium';
  @type('uint32') tick: number = 0;
  @type('string') p1SessionId: string = '';
  @type('string') p2SessionId: string = '';
}
