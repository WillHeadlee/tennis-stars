import { InputAction, InputEvent } from '@shared/types';

/**
 * InputBuffer stores local inputs and their predicted state,
 * enabling client-side prediction and server reconciliation.
 *
 * Networking model:
 * 1. Client applies input locally immediately
 * 2. Client stores input in buffer with timestamp
 * 3. Server processes inputs and sends back authoritative state
 * 4. Client compares server state with local prediction
 * 5. If drift > 5px, smoothly correct (rubber-band)
 */

export interface BufferedInput {
  sequenceNumber: number;
  action: InputAction;
  timestamp: number;
  direction?: number;
  applied: boolean;
}

export class InputBuffer {
  private buffer: BufferedInput[] = [];
  private sequenceNumber: number = 0;
  private maxBufferSize: number = 60; // ~1 second at 60fps

  // Local prediction state
  private predictedX: number = 0;
  private predictedY: number = 0;
  private predictedVx: number = 0;
  private predictedVy: number = 0;

  // Server state (for reconciliation)
  private serverX: number = 0;
  private serverY: number = 0;
  private serverTick: number = 0;

  private readonly DRIFT_THRESHOLD = 5; // pixels

  /**
   * Add an input to the buffer and return its sequence number.
   */
  addInput(action: InputAction, direction?: number): number {
    const input: BufferedInput = {
      sequenceNumber: this.sequenceNumber++,
      action,
      timestamp: Date.now(),
      direction,
      applied: false,
    };

    this.buffer.push(input);

    // Trim buffer to max size
    while (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    return input.sequenceNumber;
  }

  /**
   * Get all pending (unapplied) inputs.
   */
  getPendingInputs(): BufferedInput[] {
    return this.buffer.filter(i => !i.applied);
  }

  /**
   * Mark input as applied.
   */
  markApplied(sequenceNumber: number): void {
    const input = this.buffer.find(i => i.sequenceNumber === sequenceNumber);
    if (input) input.applied = true;
  }

  /**
   * Remove inputs older than the server-acknowledged sequence number.
   */
  acknowledge(serverSequenceNumber: number): void {
    this.buffer = this.buffer.filter(i => i.sequenceNumber > serverSequenceNumber);
  }

  /**
   * Update server state and check for reconciliation need.
   * Returns true if position needs correction.
   */
  updateServerState(
    x: number,
    y: number,
    tick: number
  ): boolean {
    this.serverX = x;
    this.serverY = y;
    this.serverTick = tick;

    const driftX = Math.abs(this.predictedX - x);
    const driftY = Math.abs(this.predictedY - y);

    return driftX > this.DRIFT_THRESHOLD || driftY > this.DRIFT_THRESHOLD;
  }

  /**
   * Get correction vector for rubber-band.
   */
  getCorrectionVector(): { dx: number; dy: number } {
    return {
      dx: (this.serverX - this.predictedX) * 0.3, // 30% per frame toward server
      dy: (this.serverY - this.predictedY) * 0.3,
    };
  }

  /**
   * Update predicted position.
   */
  setPredicted(x: number, y: number, vx: number, vy: number): void {
    this.predictedX = x;
    this.predictedY = y;
    this.predictedVx = vx;
    this.predictedVy = vy;
  }

  getPredicted(): { x: number; y: number; vx: number; vy: number } {
    return {
      x: this.predictedX,
      y: this.predictedY,
      vx: this.predictedVx,
      vy: this.predictedVy,
    };
  }

  /**
   * Clear the buffer (e.g., on disconnect/reconnect).
   */
  clear(): void {
    this.buffer = [];
    this.sequenceNumber = 0;
  }

  /**
   * Get current buffer size.
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Interpolate opponent position between two server states.
   * Returns the interpolated x position given the interpolation factor (0-1).
   */
  static interpolatePosition(
    prevX: number,
    prevY: number,
    nextX: number,
    nextY: number,
    t: number
  ): { x: number; y: number } {
    return {
      x: prevX + (nextX - prevX) * t,
      y: prevY + (nextY - prevY) * t,
    };
  }
}
