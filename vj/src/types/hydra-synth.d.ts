/**
 * Type declarations for hydra-synth
 */

declare module 'hydra-synth' {
  interface HydraOptions {
    canvas?: HTMLCanvasElement;
    detectAudio?: boolean;
    enableStreamCapture?: boolean;
    width?: number;
    height?: number;
  }

  class Hydra {
    constructor(options?: HydraOptions);
    setResolution(width: number, height: number): void;
    synth: unknown;
    canvas: HTMLCanvasElement;
  }

  export default Hydra;
}
