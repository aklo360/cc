/**
 * Audio Capture Module
 * Uses getDisplayMedia to capture system audio (Chrome/Edge only)
 */

export interface AudioCaptureOptions {
  fftSize?: number; // Power of 2, default 2048
  smoothingTimeConstant?: number; // 0-1, default 0.8
}

export interface AudioCapture {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
  stream: MediaStream;
  frequencyData: Float32Array;
  timeDomainData: Float32Array;
}

/**
 * Request system audio capture via getDisplayMedia
 * User must select a tab/window and check "Share audio"
 */
export async function captureSystemAudio(
  options: AudioCaptureOptions = {}
): Promise<AudioCapture> {
  const { fftSize = 2048, smoothingTimeConstant = 0.8 } = options;

  // Request display media with system audio
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true, // Required, but we don't use it
    audio: {
      // @ts-expect-error - systemAudio is Chrome-specific
      systemAudio: 'include',
    },
  });

  // Stop the video track immediately - we only want audio
  stream.getVideoTracks().forEach((track) => track.stop());

  // Check if we got audio
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    throw new Error(
      'No audio track captured. Make sure to check "Share tab audio" or "Share system audio".'
    );
  }

  // Create Web Audio API context
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);

  // Create analyser node for FFT
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = smoothingTimeConstant;

  // Connect source to analyser
  source.connect(analyser);

  // Pre-allocate typed arrays for FFT data
  const frequencyData = new Float32Array(analyser.frequencyBinCount);
  const timeDomainData = new Float32Array(analyser.fftSize);

  return {
    audioContext,
    analyser,
    source,
    stream,
    frequencyData,
    timeDomainData,
  };
}

/**
 * Stop audio capture and clean up resources
 */
export function stopCapture(capture: AudioCapture): void {
  capture.stream.getTracks().forEach((track) => track.stop());
  capture.source.disconnect();
  capture.audioContext.close();
}

/**
 * Check if browser supports system audio capture
 */
export function isSystemAudioSupported(): boolean {
  // Only Chrome/Edge support system audio capture
  const isChromium = /Chrome|Chromium|Edg/.test(navigator.userAgent);
  const hasGetDisplayMedia = 'getDisplayMedia' in navigator.mediaDevices;
  return isChromium && hasGetDisplayMedia;
}
