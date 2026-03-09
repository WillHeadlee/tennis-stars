import { GAMES_PER_SET, SETS_TO_WIN, TIEBREAK_POINTS } from '@shared/constants';

export type PointWinner = 'p1' | 'p2';

export interface TennisScore {
  // Current game points (raw count 0-3, with deuce handling)
  p1Points: number;
  p2Points: number;
  // Games in current set
  p1Games: number;
  p2Games: number;
  // Sets won
  p1Sets: number;
  p2Sets: number;
  // Deuce/advantage state
  isDeuce: boolean;
  advantage: -1 | 0 | 1; // -1=P2, 0=none, 1=P1
  // Tiebreak mode
  isTiebreak: boolean;
  tiebreakP1: number;
  tiebreakP2: number;
  // Server
  server: 'p1' | 'p2';
  // Match over
  matchOver: boolean;
  matchWinner: PointWinner | null;
  // Tracking
  p1TotalPoints: number;
  p2TotalPoints: number;
}

export function createInitialScore(): TennisScore {
  return {
    p1Points: 0,
    p2Points: 0,
    p1Games: 0,
    p2Games: 0,
    p1Sets: 0,
    p2Sets: 0,
    isDeuce: false,
    advantage: 0,
    isTiebreak: false,
    tiebreakP1: 0,
    tiebreakP2: 0,
    server: 'p1',
    matchOver: false,
    matchWinner: null,
    p1TotalPoints: 0,
    p2TotalPoints: 0,
  };
}

/**
 * Award a point to the winner and advance the score.
 * Returns the updated score (mutates the passed object).
 */
export function awardPoint(score: TennisScore, winner: PointWinner): TennisScore {
  if (score.matchOver) return score;

  if (winner === 'p1') score.p1TotalPoints++;
  else score.p2TotalPoints++;

  // Handle tiebreak scoring separately
  if (score.isTiebreak) {
    return handleTiebreakPoint(score, winner);
  }

  return handleGamePoint(score, winner);
}

function handleGamePoint(score: TennisScore, winner: PointWinner): TennisScore {
  if (score.isDeuce) {
    if (score.advantage === 0) {
      // First point from deuce → advantage
      score.advantage = winner === 'p1' ? 1 : -1;
    } else if (
      (winner === 'p1' && score.advantage === 1) ||
      (winner === 'p2' && score.advantage === -1)
    ) {
      // Player with advantage wins the game
      awardGame(score, winner);
    } else {
      // Back to deuce
      score.advantage = 0;
    }
    return score;
  }

  // Normal point progression
  if (winner === 'p1') score.p1Points++;
  else score.p2Points++;

  // Check for deuce (both at 40, i.e., points === 3)
  if (score.p1Points >= 3 && score.p2Points >= 3) {
    score.isDeuce = true;
    score.advantage = 0;
    // Reset points to 3 each (display as 40-40)
    score.p1Points = 3;
    score.p2Points = 3;
    return score;
  }

  // Check for game win (one player has 4+ points and other has <3, or one reaches 4 normally)
  if (score.p1Points >= 4) {
    awardGame(score, 'p1');
  } else if (score.p2Points >= 4) {
    awardGame(score, 'p2');
  }

  return score;
}

function handleTiebreakPoint(score: TennisScore, winner: PointWinner): TennisScore {
  if (winner === 'p1') score.tiebreakP1++;
  else score.tiebreakP2++;

  const p1 = score.tiebreakP1;
  const p2 = score.tiebreakP2;

  // Win tiebreak: first to 7 with 2-point lead
  if (p1 >= TIEBREAK_POINTS && p1 - p2 >= 2) {
    awardGame(score, 'p1');
    score.isTiebreak = false;
    score.tiebreakP1 = 0;
    score.tiebreakP2 = 0;
  } else if (p2 >= TIEBREAK_POINTS && p2 - p1 >= 2) {
    awardGame(score, 'p2');
    score.isTiebreak = false;
    score.tiebreakP1 = 0;
    score.tiebreakP2 = 0;
  }

  // Server switches every 2 points in tiebreak (except first point)
  const totalTiebreakPoints = p1 + p2;
  if (totalTiebreakPoints > 0 && totalTiebreakPoints % 2 === 1) {
    score.server = score.server === 'p1' ? 'p2' : 'p1';
  }

  return score;
}

function awardGame(score: TennisScore, winner: PointWinner): void {
  // Reset points
  score.p1Points = 0;
  score.p2Points = 0;
  score.isDeuce = false;
  score.advantage = 0;

  if (winner === 'p1') score.p1Games++;
  else score.p2Games++;

  // Switch server each game
  score.server = score.server === 'p1' ? 'p2' : 'p1';

  // Check for set win
  checkSetEnd(score);
}

function checkSetEnd(score: TennisScore): void {
  const p1g = score.p1Games;
  const p2g = score.p2Games;

  // Tiebreak at 6-6
  if (p1g === GAMES_PER_SET && p2g === GAMES_PER_SET) {
    score.isTiebreak = true;
    return;
  }

  // Normal set win: first to 6 with 2-game lead
  const p1WinsSet = p1g >= GAMES_PER_SET && p1g - p2g >= 2;
  const p2WinsSet = p2g >= GAMES_PER_SET && p2g - p1g >= 2;

  if (p1WinsSet) {
    score.p1Sets++;
    resetForNewSet(score);
    checkMatchEnd(score);
  } else if (p2WinsSet) {
    score.p2Sets++;
    resetForNewSet(score);
    checkMatchEnd(score);
  }
}

function resetForNewSet(score: TennisScore): void {
  score.p1Games = 0;
  score.p2Games = 0;
  score.p1Points = 0;
  score.p2Points = 0;
  score.isDeuce = false;
  score.advantage = 0;
  score.isTiebreak = false;
  score.tiebreakP1 = 0;
  score.tiebreakP2 = 0;
}

function checkMatchEnd(score: TennisScore): void {
  if (score.p1Sets >= SETS_TO_WIN) {
    score.matchOver = true;
    score.matchWinner = 'p1';
  } else if (score.p2Sets >= SETS_TO_WIN) {
    score.matchOver = true;
    score.matchWinner = 'p2';
  }
}

/** Convert raw point count (0-4) to display string */
export function pointsToDisplay(points: number, isDeuce: boolean, advantage: number, forPlayer: 'p1' | 'p2'): string {
  if (isDeuce) {
    if (advantage === 0) return '40';
    if (forPlayer === 'p1') return advantage === 1 ? 'AD' : '40';
    if (forPlayer === 'p2') return advantage === -1 ? 'AD' : '40';
  }
  const map: Record<number, string> = { 0: '0', 1: '15', 2: '30', 3: '40' };
  return map[points] ?? '0';
}

/** Check if this is match point (next point ends the match) */
export function isMatchPoint(score: TennisScore): boolean {
  if (score.matchOver) return false;

  // Would winning a point end the match?
  const testP1 = JSON.parse(JSON.stringify(score)) as TennisScore;
  awardPoint(testP1, 'p1');
  if (testP1.matchOver) return true;

  const testP2 = JSON.parse(JSON.stringify(score)) as TennisScore;
  awardPoint(testP2, 'p2');
  if (testP2.matchOver) return true;

  return false;
}

/** Returns true if the next point for `player` would win the match */
export function isMatchPointFor(score: TennisScore, player: PointWinner): boolean {
  const test = JSON.parse(JSON.stringify(score)) as TennisScore;
  awardPoint(test, player);
  return test.matchOver && test.matchWinner === player;
}
