/**
 * Scroll Velocity Tracking
 *
 * Tracks scroll velocity for adaptive virtualization behavior.
 * Provides smooth, jank-free scrolling by:
 * - Measuring instantaneous scroll velocity
 * - Smoothing velocity with exponential moving average
 * - Classifying scroll state (idle, slow, fast)
 * - Predicting scroll position for prefetching
 */

export type ScrollDirection = 'up' | 'down' | 'idle';

export type ScrollState = 'idle' | 'slow' | 'fast' | 'very-fast';

export type VelocitySnapshot = {
  /** Current smoothed velocity in px/s (positive = down, negative = up) */
  velocity: number;
  /** Absolute velocity magnitude */
  speed: number;
  /** Current scroll direction */
  direction: ScrollDirection;
  /** Classified scroll state */
  state: ScrollState;
  /** Predicted position after given ms */
  predictPosition: (ms: number) => number;
  /** Current scroll offset */
  offset: number;
  /** Timestamp of this snapshot */
  timestamp: number;
};

type VelocitySample = {
  offset: number;
  timestamp: number;
};

export type ScrollVelocityTrackerOptions = {
  /** Smoothing factor for EMA (0-1, higher = less smoothing). Default: 0.3 */
  smoothingFactor?: number;
  /** Time window for velocity calculation in ms. Default: 100 */
  sampleWindow?: number;
  /** Velocity threshold for "slow" state in px/s. Default: 200 */
  slowThreshold?: number;
  /** Velocity threshold for "fast" state in px/s. Default: 1000 */
  fastThreshold?: number;
  /** Velocity threshold for "very-fast" state in px/s. Default: 3000 */
  veryFastThreshold?: number;
  /** Decay factor for velocity when no samples (0-1). Default: 0.85 */
  decayFactor?: number;
  /** Time after which to consider scroll idle in ms. Default: 150 */
  idleTimeout?: number;
};

const DEFAULT_OPTIONS: Required<ScrollVelocityTrackerOptions> = {
  smoothingFactor: 0.3,
  sampleWindow: 100,
  slowThreshold: 200,
  fastThreshold: 1000,
  veryFastThreshold: 3000,
  decayFactor: 0.85,
  idleTimeout: 150,
};

/**
 * Creates a scroll velocity tracker.
 * Call `update()` on each scroll event, `getSnapshot()` to read current state.
 */
export function createScrollVelocityTracker(
  opts: ScrollVelocityTrackerOptions = {}
) {
  const options = { ...DEFAULT_OPTIONS, ...opts };

  // State
  let samples: VelocitySample[] = [];
  let smoothedVelocity = 0;
  let currentOffset = 0;
  let lastUpdateTime = 0;
  let lastNonIdleTime = 0;

  /**
   * Update tracker with new scroll offset.
   * Call this on every scroll event.
   */
  function update(offset: number): void {
    const now = performance.now();
    currentOffset = offset;

    // Add sample
    samples.push({ offset, timestamp: now });

    // Keep only samples within window
    const windowStart = now - options.sampleWindow;
    samples = samples.filter((s) => s.timestamp >= windowStart);

    // Calculate instantaneous velocity from samples
    if (samples.length >= 2) {
      const oldest = samples[0]!;
      const newest = samples[samples.length - 1]!;
      const dt = (newest.timestamp - oldest.timestamp) / 1000; // Convert to seconds

      if (dt > 0) {
        const instantVelocity = (newest.offset - oldest.offset) / dt;

        // Apply exponential moving average smoothing
        smoothedVelocity =
          options.smoothingFactor * instantVelocity +
          (1 - options.smoothingFactor) * smoothedVelocity;

        lastNonIdleTime = now;
      }
    }

    lastUpdateTime = now;
  }

  /**
   * Apply velocity decay when not actively scrolling.
   * Call this periodically (e.g., in RAF loop) during scroll.
   */
  function decay(): void {
    const now = performance.now();
    const timeSinceUpdate = now - lastUpdateTime;

    if (timeSinceUpdate > 16) {
      // ~1 frame
      smoothedVelocity *= options.decayFactor;

      // Snap to zero when very small
      if (Math.abs(smoothedVelocity) < 1) {
        smoothedVelocity = 0;
      }
    }
  }

  /**
   * Get current velocity snapshot.
   */
  function getSnapshot(): VelocitySnapshot {
    const now = performance.now();
    const timeSinceLastScroll = now - lastNonIdleTime;
    const isIdle = timeSinceLastScroll > options.idleTimeout;

    // Apply decay if idle
    if (isIdle) {
      smoothedVelocity *= Math.pow(
        options.decayFactor,
        timeSinceLastScroll / 16
      );
      if (Math.abs(smoothedVelocity) < 1) {
        smoothedVelocity = 0;
      }
    }

    const speed = Math.abs(smoothedVelocity);
    const direction: ScrollDirection = isIdle
      ? 'idle'
      : smoothedVelocity > 0
        ? 'down'
        : smoothedVelocity < 0
          ? 'up'
          : 'idle';

    const state: ScrollState = isIdle
      ? 'idle'
      : speed >= options.veryFastThreshold
        ? 'very-fast'
        : speed >= options.fastThreshold
          ? 'fast'
          : speed >= options.slowThreshold
            ? 'slow'
            : 'idle';

    // Prediction function using velocity + deceleration model
    const predictPosition = (ms: number): number => {
      // Simple linear prediction (can be improved with deceleration)
      const seconds = ms / 1000;
      // Apply slight deceleration for more realistic prediction
      const decelFactor = Math.max(0.5, 1 - seconds * 0.5);
      return currentOffset + smoothedVelocity * seconds * decelFactor;
    };

    return {
      velocity: smoothedVelocity,
      speed,
      direction,
      state,
      predictPosition,
      offset: currentOffset,
      timestamp: now,
    };
  }

  /**
   * Reset tracker state.
   */
  function reset(): void {
    samples = [];
    smoothedVelocity = 0;
    lastUpdateTime = 0;
    lastNonIdleTime = 0;
  }

  return {
    update,
    decay,
    getSnapshot,
    reset,
  };
}

export type ScrollVelocityTracker = ReturnType<
  typeof createScrollVelocityTracker
>;

/**
 * Calculate adaptive overscan based on scroll velocity.
 *
 * Returns the number of items to render outside the viewport.
 * Increases overscan during fast scrolls to prevent blank areas.
 */
export function calculateAdaptiveOverscan(
  snapshot: VelocitySnapshot,
  baseOverscan: number,
  itemHeight: number
): number {
  // Base overscan for idle/slow scrolling
  if (snapshot.state === 'idle' || snapshot.state === 'slow') {
    return baseOverscan;
  }

  // Calculate how many items we'd scroll past in ~100ms at current velocity
  const itemsPerSecond = Math.abs(snapshot.velocity) / itemHeight;
  const itemsPer100ms = itemsPerSecond / 10;

  // Scale overscan based on velocity
  // At fast scroll: add ~10 items
  // At very-fast scroll: add ~20 items
  const velocityOverscan = Math.ceil(itemsPer100ms * 1.5);

  // Clamp to reasonable bounds
  return Math.min(baseOverscan + velocityOverscan, 50);
}

/**
 * Calculate adaptive buffer size (in pixels) based on scroll velocity.
 *
 * Returns buffer size for virtua's bufferSize prop.
 * Higher buffer = smoother fast scrolling.
 */
export function calculateAdaptiveBufferSize(
  snapshot: VelocitySnapshot,
  viewportHeight: number
): number {
  switch (snapshot.state) {
    case 'idle':
      // Minimal buffer when idle - saves memory
      return viewportHeight * 2;
    case 'slow':
      // Moderate buffer for casual scrolling
      return viewportHeight * 3;
    case 'fast':
      // Large buffer for fast scrolling
      return viewportHeight * 5;
    case 'very-fast':
      // Maximum buffer for very fast scrolling
      return viewportHeight * 8;
  }
}

/**
 * Determine if we should trigger a prefetch based on velocity.
 *
 * Returns true if scrolling toward the end fast enough to warrant early fetch.
 */
export function shouldVelocityPrefetch(
  snapshot: VelocitySnapshot,
  totalItems: number,
  currentIndex: number,
  itemHeight: number,
  threshold: number = 50
): boolean {
  // Only prefetch when scrolling down
  if (snapshot.direction !== 'down') {
    return false;
  }

  // Calculate items ahead
  const itemsAhead = totalItems - currentIndex;

  // During fast scrolls, prefetch earlier
  if (snapshot.state === 'very-fast') {
    // Prefetch when we have less than 2 seconds of scroll ahead
    const itemsPerSecond = snapshot.speed / itemHeight;
    const secondsAhead = itemsAhead / itemsPerSecond;
    return secondsAhead < 2;
  }

  if (snapshot.state === 'fast') {
    // Prefetch when we have less than 1.5 seconds ahead
    const itemsPerSecond = snapshot.speed / itemHeight;
    const secondsAhead = itemsAhead / itemsPerSecond;
    return secondsAhead < 1.5;
  }

  // For slow/idle, use simple threshold
  return itemsAhead < threshold;
}
