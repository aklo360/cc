/**
 * Beat Detection Module
 * Uses realtime-bpm-analyzer for accurate BPM detection
 * Also implements custom onset detection for visual sync
 */

import type { AudioCapture } from './capture.js';

export interface BeatState {
  bpm: number | null;
  confidence: number;
  lastBeatTime: number;
  beatInterval: number; // ms between beats
  phase: number; // 0-1 position in current beat
}

// Internal state for beat tracking
let currentBpm: number | null = null;
let bpmConfidence = 0;
let lastBeatTime = 0;
let beatHistory: number[] = [];
const BEAT_HISTORY_SIZE = 8;

// Energy-based beat detection
let energyHistory: number[] = [];
const ENERGY_HISTORY_SIZE = 43; // ~0.7 seconds at 60fps
let energyThreshold = 0;

/**
 * Initialize beat detection with audio capture
 * Uses energy-based detection (reliable across all browsers)
 */
export async function initBeatDetection(
  _capture: AudioCapture
): Promise<void> {
  // Reset state for new capture
  resetBeatState();
  console.log('Beat detection initialized (energy-based)');
}

/**
 * Update beat detection state
 * Call this every frame in your animation loop
 */
export function updateBeat(bassEnergy: number): BeatState {
  const now = performance.now();

  // Update energy history for beat detection
  energyHistory.push(bassEnergy);
  if (energyHistory.length > ENERGY_HISTORY_SIZE) {
    energyHistory.shift();
  }

  // Calculate dynamic threshold
  const avgEnergy =
    energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;
  const variance =
    energyHistory.reduce((sum, e) => sum + Math.pow(e - avgEnergy, 2), 0) /
    energyHistory.length;
  energyThreshold = avgEnergy + Math.sqrt(variance) * 1.5;

  // Detect beat onset
  const isBeat = bassEnergy > energyThreshold && bassEnergy > 0.3;

  if (isBeat) {
    // Record beat timing
    const timeSinceLastBeat = now - lastBeatTime;

    // Only register if enough time has passed (debounce)
    if (timeSinceLastBeat > 200) {
      // Min 300 BPM
      beatHistory.push(timeSinceLastBeat);
      if (beatHistory.length > BEAT_HISTORY_SIZE) {
        beatHistory.shift();
      }
      lastBeatTime = now;

      // Calculate BPM from beat intervals if library isn't available
      if (currentBpm === null && beatHistory.length >= 4) {
        const avgInterval =
          beatHistory.reduce((a, b) => a + b, 0) / beatHistory.length;
        currentBpm = 60000 / avgInterval;
        bpmConfidence = Math.min(1, beatHistory.length / BEAT_HISTORY_SIZE);
      }
    }
  }

  // Calculate beat interval and phase
  const beatInterval = currentBpm ? 60000 / currentBpm : 500;
  const timeSinceBeat = now - lastBeatTime;
  const phase = (timeSinceBeat % beatInterval) / beatInterval;

  return {
    bpm: currentBpm,
    confidence: bpmConfidence,
    lastBeatTime,
    beatInterval,
    phase,
  };
}

/**
 * Get current BPM
 */
export function getBpm(): number | null {
  return currentBpm;
}

/**
 * Get beat phase (0-1, where 0 is on the beat)
 */
export function getBeatPhase(): number {
  if (!currentBpm) return 0;
  const beatInterval = 60000 / currentBpm;
  const timeSinceBeat = performance.now() - lastBeatTime;
  return (timeSinceBeat % beatInterval) / beatInterval;
}

/**
 * Check if we're near a beat (within tolerance)
 */
export function isOnBeat(tolerance = 0.1): boolean {
  const phase = getBeatPhase();
  return phase < tolerance || phase > 1 - tolerance;
}

/**
 * Get a value that pulses on the beat (1 at beat, decays to 0)
 */
export function getBeatPulse(decayRate = 0.95): number {
  const phase = getBeatPhase();
  return Math.pow(1 - phase, 3); // Cubic decay for snappy response
}

/**
 * Reset beat detection state
 */
export function resetBeatState(): void {
  currentBpm = null;
  bpmConfidence = 0;
  lastBeatTime = 0;
  beatHistory = [];
  energyHistory = [];
}
