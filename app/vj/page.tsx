'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Types
type EngineTypeV2 = 'threejs' | 'hydra';
type VisualMode = 'spiral' | 'morph' | 'dystopia' | 'geometry' | 'warp' | 'glitch' | 'liquid' | 'auto';

interface VJStateV2 {
  isRunning: boolean;
  isCapturing: boolean;
  engine: EngineTypeV2;
  mode: VisualMode;
  bpm: number | null;
  fps: number;
}

function VJPageContent() {
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const vjRef = useRef<any>(null);

  // Get URL params for stream mode
  const paramEngine = searchParams.get('engine') as EngineTypeV2 | null;
  const paramMode = searchParams.get('mode') as VisualMode | null;
  const paramHideUI = searchParams.get('hideUI') === 'true';

  const [state, setState] = useState<VJStateV2>({
    isRunning: false,
    isCapturing: false,
    engine: paramEngine || 'hydra',
    mode: paramMode || 'auto',
    bpm: null,
    fps: 0,
  });
  const [showUI, setShowUI] = useState(!paramHideUI);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Initialize VJ v2
  useEffect(() => {
    let vj: any = null;

    const init = async () => {
      try {
        // Dynamic import of VJ v2 module
        // @ts-ignore - VJ module may not exist in all builds
        const module = await import('../../vj/src/index-v2.ts').catch(() => null);
        if (!module) {
          setIsSupported(false);
          setError('VJ module not available in this deployment');
          return;
        }
        const VJv2 = module.VJv2;

        // Check browser support
        if (!VJv2.isSupported()) {
          setIsSupported(false);
          setError('System audio capture requires Chrome or Edge browser');
          return;
        }

        if (!containerRef.current) return;

        vj = new VJv2();
        vjRef.current = vj;

        await vj.init(containerRef.current, {
          engine: paramEngine || 'hydra',
          style: 'branded', // Always branded
          mode: paramMode || 'auto',
        });

        // Start animation loop
        vj.start();

        // Update state periodically
        const updateState = () => {
          if (vj) {
            const s = vj.getState();
            setState({
              isRunning: s.isRunning,
              isCapturing: s.isCapturing,
              engine: s.engine,
              mode: s.mode,
              bpm: s.beat?.bpm || null,
              fps: s.fps,
            });
          }
        };

        const interval = setInterval(updateState, 100);

        return () => {
          clearInterval(interval);
          if (vj) {
            vj.dispose();
          }
        };
      } catch (err) {
        console.error('Failed to initialize VJ:', err);
        setError('Failed to initialize VJ. Check console for details.');
      }
    };

    init();

    return () => {
      if (vjRef.current) {
        vjRef.current.dispose();
        vjRef.current = null;
      }
    };
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (vjRef.current) {
        vjRef.current.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Start audio capture
  const startCapture = useCallback(async () => {
    if (!vjRef.current) return;
    try {
      await vjRef.current.startCapture();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to capture audio');
    }
  }, []);

  // Stop audio capture
  const stopCapture = useCallback(() => {
    if (vjRef.current) {
      vjRef.current.stopCapture();
    }
  }, []);

  // Switch engine
  const setEngine = useCallback(async (engine: EngineTypeV2) => {
    if (!vjRef.current) return;
    try {
      await vjRef.current.setEngine(engine);
    } catch (err: any) {
      setError(err.message || 'Failed to switch engine');
    }
  }, []);

  // Set mode
  const setMode = useCallback((mode: VisualMode) => {
    if (vjRef.current) {
      vjRef.current.setMode(mode);
    }
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'h':
          setShowUI((prev) => !prev);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case '1':
          setEngine('threejs');
          break;
        case '2':
          setEngine('hydra');
          break;
        // Mode shortcuts (7 modes + auto)
        case 's':
          setMode('spiral');
          break;
        case 'm':
          setMode('morph');
          break;
        case 'd':
          setMode('dystopia');
          break;
        case 'g':
          setMode('geometry');
          break;
        case 'w':
          setMode('warp');
          break;
        case 'x':
          setMode('glitch');
          break;
        case 'l':
          setMode('liquid');
          break;
        case 'a':
          setMode('auto');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setEngine, setMode, toggleFullscreen]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0d0d0d]">
      {/* Visual container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* UI Overlay */}
      {showUI && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-auto">
            {/* Logo */}
            <Link
              href="/"
              className="text-[#da7756] font-mono text-xl hover:text-white transition-colors flex items-center gap-2"
            >
              <img src="/cc.png" alt="$CC" className="w-8 h-8" />
              $CC VJ
            </Link>

            {/* Stats */}
            <div className="text-white/50 font-mono text-sm text-right">
              <div className="text-[#da7756] font-bold">{state.fps} FPS</div>
              {state.bpm && <div>{Math.round(state.bpm)} BPM</div>}
              <div className="text-xs mt-1">
                {state.isCapturing ? (
                  <span className="text-green-400">LIVE AUDIO</span>
                ) : (
                  <span className="text-fuchsia-400">DEMO MODE</span>
                )}
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-900/80 text-white px-4 py-2 rounded font-mono text-sm pointer-events-auto">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-white/70 hover:text-white"
              >
                X
              </button>
            </div>
          )}

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
            <div className="max-w-5xl mx-auto bg-black/80 backdrop-blur-lg rounded-lg p-4 border border-[#da7756]/30">
              <div className="flex flex-wrap gap-3 justify-between items-center">
                {/* Audio capture */}
                <div className="flex gap-2">
                  {!state.isCapturing ? (
                    <button
                      onClick={startCapture}
                      disabled={!isSupported}
                      className="px-4 py-2 bg-[#da7756] text-black font-mono rounded hover:bg-[#e8957a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
                    >
                      Start Audio
                    </button>
                  ) : (
                    <button
                      onClick={stopCapture}
                      className="px-4 py-2 bg-red-600 text-white font-mono rounded hover:bg-red-500 transition-colors font-bold"
                    >
                      Stop Audio
                    </button>
                  )}
                </div>

                {/* Engine selector */}
                <div className="flex gap-1 items-center">
                  <span className="text-white/50 font-mono text-xs mr-1">Engine:</span>
                  {(['threejs', 'hydra'] as EngineTypeV2[]).map((e) => (
                    <button
                      key={e}
                      onClick={() => setEngine(e)}
                      className={`px-2 py-1 font-mono text-xs rounded transition-colors ${
                        state.engine === e
                          ? 'bg-[#da7756] text-black font-bold'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {e === 'threejs' ? '3JS' : 'HYD'}
                    </button>
                  ))}
                </div>

                {/* Mode selector - 8 modes (7 + auto) */}
                <div className="flex gap-1 items-center flex-wrap">
                  <span className="text-white/50 font-mono text-xs mr-1">Mode:</span>
                  {(['spiral', 'morph', 'dystopia', 'geometry', 'warp', 'glitch', 'liquid', 'auto'] as VisualMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-2 py-1 font-mono text-xs rounded uppercase transition-colors ${
                        state.mode === m
                          ? 'bg-cyan-500 text-black font-bold'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="px-2 py-1 bg-white/10 text-white font-mono text-xs rounded hover:bg-white/20 transition-colors"
                >
                  FS
                </button>
              </div>

              {/* Keyboard shortcuts */}
              <div className="mt-2 pt-2 border-t border-white/10 text-white/30 font-mono text-[10px] flex flex-wrap gap-3">
                <span>H: Hide</span>
                <span>F: Fullscreen</span>
                <span>1/2: Engine</span>
                <span>S/M/D/G/W/X/L/A: Modes</span>
              </div>
            </div>
          </div>

          {/* Browser warning */}
          {!isSupported && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-auto">
              <div className="bg-[#1a1a1a] p-8 rounded-lg max-w-md text-center border border-[#da7756]/50">
                <img src="/cc.png" alt="$CC" className="w-16 h-16 mx-auto mb-4" />
                <h2 className="text-white text-xl font-mono mb-4">
                  Chrome or Edge Required
                </h2>
                <p className="text-white/70 font-mono text-sm mb-4">
                  System audio capture only works in Chrome or Edge browsers.
                  The VJ will run in demo mode with simulated audio.
                </p>
                <Link
                  href="/"
                  className="inline-block px-4 py-2 bg-[#da7756] text-black font-mono rounded hover:bg-[#e8957a] transition-colors font-bold"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VJPage() {
  return (
    <Suspense fallback={<div className="w-screen h-screen bg-[#0d0d0d]" />}>
      <VJPageContent />
    </Suspense>
  );
}
