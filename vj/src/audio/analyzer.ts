/**
 * Audio Analyzer Module
 * Processes FFT data into usable frequency bands and audio features
 */

import type { AudioCapture } from './capture';

export interface FrequencyBands {
  bass: number; // 20-250 Hz (kick drums, bass)
  lowMid: number; // 250-500 Hz (warmth, body)
  mid: number; // 500-2000 Hz (vocals, instruments)
  highMid: number; // 2000-4000 Hz (presence, clarity)
  high: number; // 4000-20000 Hz (brilliance, air)
}

export interface AudioFeatures {
  bands: FrequencyBands;
  overall: number; // Overall amplitude 0-1
  peak: number; // Peak frequency bin value
  spectralCentroid: number; // "Brightness" measure
  isBeat: boolean; // Simple beat detection
}

// Frequency band boundaries in Hz
const BAND_RANGES = {
  bass: [20, 250],
  lowMid: [250, 500],
  mid: [500, 2000],
  highMid: [2000, 4000],
  high: [4000, 20000],
} as const;

// Beat detection state
let lastBassEnergy = 0;
let beatThreshold = 1.3; // How much louder than average to trigger beat
let beatDecay = 0.98; // How fast threshold decays

/**
 * Convert frequency to FFT bin index
 */
function frequencyToBin(
  frequency: number,
  sampleRate: number,
  fftSize: number
): number {
  return Math.round((frequency * fftSize) / sampleRate);
}

/**
 * Get average amplitude in a frequency range
 */
function getAverageInRange(
  frequencyData: Float32Array<ArrayBufferLike>,
  sampleRate: number,
  fftSize: number,
  lowFreq: number,
  highFreq: number
): number {
  const lowBin = frequencyToBin(lowFreq, sampleRate, fftSize);
  const highBin = frequencyToBin(highFreq, sampleRate, fftSize);

  let sum = 0;
  let count = 0;

  for (let i = lowBin; i <= highBin && i < frequencyData.length; i++) {
    // Convert from dB to linear (0-1 range)
    // FFT data is typically -100 to 0 dB
    const linearValue = Math.pow(10, frequencyData[i] / 20);
    sum += linearValue;
    count++;
  }

  return count > 0 ? sum / count : 0;
}

/**
 * Analyze audio capture and extract features
 * Call this in your animation loop (60fps)
 */
export function analyze(capture: AudioCapture): AudioFeatures {
  const { analyser, frequencyData } = capture;
  const sampleRate = capture.audioContext.sampleRate;
  const fftSize = analyser.fftSize;

  // Get fresh FFT data
  analyser.getFloatFrequencyData(frequencyData);

  // Calculate frequency bands
  const bands: FrequencyBands = {
    bass: getAverageInRange(
      frequencyData,
      sampleRate,
      fftSize,
      BAND_RANGES.bass[0],
      BAND_RANGES.bass[1]
    ),
    lowMid: getAverageInRange(
      frequencyData,
      sampleRate,
      fftSize,
      BAND_RANGES.lowMid[0],
      BAND_RANGES.lowMid[1]
    ),
    mid: getAverageInRange(
      frequencyData,
      sampleRate,
      fftSize,
      BAND_RANGES.mid[0],
      BAND_RANGES.mid[1]
    ),
    highMid: getAverageInRange(
      frequencyData,
      sampleRate,
      fftSize,
      BAND_RANGES.highMid[0],
      BAND_RANGES.highMid[1]
    ),
    high: getAverageInRange(
      frequencyData,
      sampleRate,
      fftSize,
      BAND_RANGES.high[0],
      BAND_RANGES.high[1]
    ),
  };

  // Normalize bands to 0-1 range (rough normalization)
  const normalize = (value: number) => Math.min(1, Math.max(0, value * 10));
  bands.bass = normalize(bands.bass);
  bands.lowMid = normalize(bands.lowMid);
  bands.mid = normalize(bands.mid);
  bands.highMid = normalize(bands.highMid);
  bands.high = normalize(bands.high);

  // Calculate overall amplitude
  const overall =
    (bands.bass + bands.lowMid + bands.mid + bands.highMid + bands.high) / 5;

  // Find peak
  let peak = -Infinity;
  for (let i = 0; i < frequencyData.length; i++) {
    if (frequencyData[i] > peak) {
      peak = frequencyData[i];
    }
  }
  peak = Math.pow(10, peak / 20); // Convert to linear

  // Calculate spectral centroid (brightness)
  let weightedSum = 0;
  let magnitudeSum = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    const magnitude = Math.pow(10, frequencyData[i] / 20);
    const frequency = (i * sampleRate) / fftSize;
    weightedSum += frequency * magnitude;
    magnitudeSum += magnitude;
  }
  const spectralCentroid =
    magnitudeSum > 0 ? weightedSum / magnitudeSum / 10000 : 0; // Normalize to ~0-1

  // Simple beat detection based on bass energy
  const isBeat = bands.bass > lastBassEnergy * beatThreshold;
  lastBassEnergy = lastBassEnergy * beatDecay + bands.bass * (1 - beatDecay);

  return {
    bands,
    overall,
    peak: Math.min(1, peak * 10),
    spectralCentroid: Math.min(1, spectralCentroid),
    isBeat,
  };
}

/**
 * Get raw frequency data for custom visualizations
 */
export function getRawFrequencyData(capture: AudioCapture): Float32Array<ArrayBufferLike> {
  capture.analyser.getFloatFrequencyData(capture.frequencyData);
  return capture.frequencyData;
}

/**
 * Get raw time domain data (waveform)
 */
export function getTimeDomainData(capture: AudioCapture): Float32Array<ArrayBufferLike> {
  capture.analyser.getFloatTimeDomainData(capture.timeDomainData);
  return capture.timeDomainData;
}

/**
 * Reset beat detection state
 */
export function resetBeatDetection(): void {
  lastBassEnergy = 0;
}
