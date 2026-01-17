/**
 * Tests for scroll velocity tracking utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createScrollVelocityTracker,
  shouldVelocityPrefetch,
  type VelocitySnapshot,
} from '../core/scrollVelocity';

describe('Scroll Velocity Tracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createScrollVelocityTracker', () => {
    it('starts with idle state', () => {
      const tracker = createScrollVelocityTracker();
      const snapshot = tracker.getSnapshot();

      expect(snapshot.state).toBe('idle');
      expect(snapshot.velocity).toBe(0);
      expect(snapshot.speed).toBe(0);
      expect(snapshot.direction).toBe('idle');
    });

    it('tracks scroll velocity when scrolling down', () => {
      const tracker = createScrollVelocityTracker({
        sampleWindow: 100,
        smoothingFactor: 1, // No smoothing for predictable tests
      });

      // Simulate scrolling down 1000px over 100ms = 10000 px/s
      tracker.update(0);
      vi.advanceTimersByTime(50);
      tracker.update(500);
      vi.advanceTimersByTime(50);
      tracker.update(1000);

      const snapshot = tracker.getSnapshot();

      expect(snapshot.direction).toBe('down');
      expect(snapshot.velocity).toBeGreaterThan(0);
    });

    it('tracks scroll velocity when scrolling up', () => {
      const tracker = createScrollVelocityTracker({
        sampleWindow: 100,
        smoothingFactor: 1,
      });

      // Start at offset 1000, scroll up
      tracker.update(1000);
      vi.advanceTimersByTime(50);
      tracker.update(500);
      vi.advanceTimersByTime(50);
      tracker.update(0);

      const snapshot = tracker.getSnapshot();

      expect(snapshot.direction).toBe('up');
      expect(snapshot.velocity).toBeLessThan(0);
    });

    it('classifies slow scrolling correctly', () => {
      const tracker = createScrollVelocityTracker({
        slowThreshold: 200,
        fastThreshold: 1000,
        smoothingFactor: 1,
        sampleWindow: 100,
      });

      // Scroll at ~300 px/s (30px over 100ms)
      tracker.update(0);
      vi.advanceTimersByTime(100);
      tracker.update(30);

      const snapshot = tracker.getSnapshot();
      expect(snapshot.state).toBe('slow');
    });

    it('classifies fast scrolling correctly', () => {
      const tracker = createScrollVelocityTracker({
        slowThreshold: 200,
        fastThreshold: 1000,
        veryFastThreshold: 3000,
        smoothingFactor: 1,
        sampleWindow: 100,
      });

      // Scroll at ~1500 px/s (150px over 100ms)
      tracker.update(0);
      vi.advanceTimersByTime(100);
      tracker.update(150);

      const snapshot = tracker.getSnapshot();
      expect(snapshot.state).toBe('fast');
    });

    it('classifies very fast scrolling correctly', () => {
      const tracker = createScrollVelocityTracker({
        slowThreshold: 200,
        fastThreshold: 1000,
        veryFastThreshold: 3000,
        smoothingFactor: 1,
        sampleWindow: 100,
      });

      // Scroll at ~4000 px/s (400px over 100ms)
      tracker.update(0);
      vi.advanceTimersByTime(100);
      tracker.update(400);

      const snapshot = tracker.getSnapshot();
      expect(snapshot.state).toBe('very-fast');
    });

    it('decays to idle after no scroll events', () => {
      const tracker = createScrollVelocityTracker({
        idleTimeout: 150,
        smoothingFactor: 1,
        sampleWindow: 100,
      });

      // Start scrolling
      tracker.update(0);
      vi.advanceTimersByTime(50);
      tracker.update(100);

      // Should be active
      let snapshot = tracker.getSnapshot();
      expect(snapshot.direction).toBe('down');

      // Wait for idle timeout
      vi.advanceTimersByTime(200);

      // Should be idle now
      snapshot = tracker.getSnapshot();
      expect(snapshot.state).toBe('idle');
    });

    it('predicts future scroll position', () => {
      const tracker = createScrollVelocityTracker({
        smoothingFactor: 1,
        sampleWindow: 100,
      });

      // Scroll at 1000 px/s
      tracker.update(0);
      vi.advanceTimersByTime(100);
      tracker.update(100);

      const snapshot = tracker.getSnapshot();

      // Predict position 500ms in the future
      // At 1000 px/s, should be around current + 500px (with some deceleration)
      const predicted = snapshot.predictPosition(500);
      expect(predicted).toBeGreaterThan(snapshot.offset);
      expect(predicted).toBeLessThan(snapshot.offset + 1000); // Less than linear due to deceleration
    });

    it('reset clears all state', () => {
      const tracker = createScrollVelocityTracker();

      tracker.update(0);
      vi.advanceTimersByTime(50);
      tracker.update(1000);

      tracker.reset();

      const snapshot = tracker.getSnapshot();
      expect(snapshot.velocity).toBe(0);
      expect(snapshot.state).toBe('idle');
    });
  });

  describe('shouldVelocityPrefetch', () => {
    const createSnapshot = (
      overrides: Partial<VelocitySnapshot>
    ): VelocitySnapshot => ({
      velocity: 0,
      speed: 0,
      direction: 'idle',
      state: 'idle',
      predictPosition: () => 0,
      offset: 0,
      timestamp: Date.now(),
      ...overrides,
    });

    it('returns false when scrolling up', () => {
      const snapshot = createSnapshot({
        direction: 'up',
        state: 'fast',
        speed: 2000,
      });

      const result = shouldVelocityPrefetch(snapshot, 1000, 500, 40, 50);
      expect(result).toBe(false);
    });

    it('returns false when idle', () => {
      const snapshot = createSnapshot({
        direction: 'idle',
        state: 'idle',
        speed: 0,
      });

      const result = shouldVelocityPrefetch(snapshot, 1000, 500, 40, 50);
      expect(result).toBe(false);
    });

    it('returns true during fast scroll when low on buffer time', () => {
      const snapshot = createSnapshot({
        direction: 'down',
        state: 'fast',
        speed: 2000, // 2000 px/s = 50 items/s at 40px height
        velocity: 2000,
      });

      // 1000 items total, at index 950, 50 items ahead
      // At 50 items/s, that's 1 second ahead - should trigger fetch
      const result = shouldVelocityPrefetch(snapshot, 1000, 950, 40, 50);
      expect(result).toBe(true);
    });

    it('returns false during fast scroll with plenty of buffer time', () => {
      const snapshot = createSnapshot({
        direction: 'down',
        state: 'fast',
        speed: 1000, // 1000 px/s = 25 items/s at 40px height
        velocity: 1000,
      });

      // 1000 items total, at index 0, 1000 items ahead
      // At 25 items/s, that's 40 seconds ahead - plenty of buffer
      const result = shouldVelocityPrefetch(snapshot, 1000, 0, 40, 50);
      expect(result).toBe(false);
    });

    it('returns true during very-fast scroll even with more buffer', () => {
      const snapshot = createSnapshot({
        direction: 'down',
        state: 'very-fast',
        speed: 4000, // 4000 px/s = 100 items/s at 40px height
        velocity: 4000,
      });

      // 1000 items total, at index 850, 150 items ahead
      // At 100 items/s, that's 1.5 seconds ahead - triggers fetch for very-fast (< 2s)
      const result = shouldVelocityPrefetch(snapshot, 1000, 850, 40, 50);
      expect(result).toBe(true);
    });
  });
});
