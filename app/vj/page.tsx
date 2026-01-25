'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

// Types (inline to avoid import issues with vj/ module)
type EngineType = 'threejs' | 'hydra' | 'remotion';
type VisualStyle = 'abstract' | 'branded' | 'synthwave' | 'auto';

interface VJState {
  isRunning: boolean;
  isCapturing: boolean;
  engine: EngineType;
  style: VisualStyle;
  bpm: number | null;
  fps: number;
}

export default function VJPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const vjRef = useRef<any>(null);
  const [state, setState] = useState<VJState>({
    isRunning: false,
    isCapturing: false,
    engine: 'threejs',
    style: 'synthwave',
    bpm: null,
    fps: 0,
  });
  const [showUI, setShowUI] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Initialize VJ
  useEffect(() => {
    let vj: any = null;

    const init = async () => {
      try {
        // Dynamic import of VJ module - may not exist in all deployments
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - VJ module may not exist in all builds
        const module = await import('../../vj/src/index.js').catch(() => null);
        if (!module) {
          setIsSupported(false);
          setError('VJ module not available in this deployment');
          return;
        }
        const VJ = module.VJ;

        // Check browser support
        if (!VJ.isSupported()) {
          setIsSupported(false);
          setError('System audio capture requires Chrome or Edge browser');
          return;
        }

        if (!containerRef.current) return;

        vj = new VJ();
        vjRef.current = vj;

        await vj.init(containerRef.current, {
          engine: 'threejs',
          style: 'synthwave',
        });

        // Start animation loop (will use fake audio until capture starts)
        vj.start();

        // Update state periodically
        const updateState = () => {
          if (vj) {
            const s = vj.getState();
            setState({
              isRunning: s.isRunning,
              isCapturing: s.isCapturing,
              engine: s.engine,
              style: s.style,
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
  const setEngine = useCallback(async (engine: EngineType) => {
    if (!vjRef.current) return;
    try {
      await vjRef.current.setEngine(engine);
    } catch (err: any) {
      setError(err.message || 'Failed to switch engine');
    }
  }, []);

  // Set style
  const setStyle = useCallback((style: VisualStyle) => {
    if (vjRef.current) {
      vjRef.current.setStyle(style);
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
        case '3':
          setEngine('remotion');
          break;
        case 'a':
          setStyle('abstract');
          break;
        case 'b':
          setStyle('branded');
          break;
        case 's':
          setStyle('synthwave');
          break;
        case 'x':
          setStyle('auto');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setEngine, setStyle, toggleFullscreen]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
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
              className="text-[#da7756] font-mono text-xl hover:text-white transition-colors"
            >
              $CC VJ
            </Link>

            {/* Stats */}
            <div className="text-white/50 font-mono text-sm text-right">
              <div>{state.fps} FPS</div>
              {state.bpm && <div>{Math.round(state.bpm)} BPM</div>}
              <div className="text-xs mt-1">
                {state.isCapturing ? '🎵 LIVE' : '🔇 DEMO'}
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
                ✕
              </button>
            </div>
          )}

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
            <div className="max-w-4xl mx-auto bg-black/60 backdrop-blur rounded-lg p-4">
              <div className="flex flex-wrap gap-4 justify-between items-center">
                {/* Audio capture */}
                <div className="flex gap-2">
                  {!state.isCapturing ? (
                    <button
                      onClick={startCapture}
                      disabled={!isSupported}
                      className="px-4 py-2 bg-[#da7756] text-black font-mono rounded hover:bg-[#e8957a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      🎤 Start Audio
                    </button>
                  ) : (
                    <button
                      onClick={stopCapture}
                      className="px-4 py-2 bg-red-600 text-white font-mono rounded hover:bg-red-500 transition-colors"
                    >
                      ⏹ Stop Audio
                    </button>
                  )}
                </div>

                {/* Engine selector */}
                <div className="flex gap-1">
                  <span className="text-white/50 font-mono text-sm mr-2">Engine:</span>
                  {(['threejs', 'hydra', 'remotion'] as EngineType[]).map((e) => (
                    <button
                      key={e}
                      onClick={() => setEngine(e)}
                      className={`px-3 py-1 font-mono text-sm rounded transition-colors ${
                        state.engine === e
                          ? 'bg-[#da7756] text-black'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {e === 'threejs' ? 'Three.js' : e === 'hydra' ? 'Hydra' : 'Remotion'}
                    </button>
                  ))}
                </div>

                {/* Style selector */}
                <div className="flex gap-1">
                  <span className="text-white/50 font-mono text-sm mr-2">Style:</span>
                  {(['abstract', 'branded', 'synthwave', 'auto'] as VisualStyle[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`px-3 py-1 font-mono text-sm rounded capitalize transition-colors ${
                        state.style === s
                          ? 'bg-[#da7756] text-black'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="px-3 py-1 bg-white/10 text-white font-mono text-sm rounded hover:bg-white/20 transition-colors"
                >
                  ⛶ Fullscreen
                </button>
              </div>

              {/* Keyboard shortcuts */}
              <div className="mt-3 pt-3 border-t border-white/10 text-white/30 font-mono text-xs">
                <span className="mr-4">H: Hide UI</span>
                <span className="mr-4">F: Fullscreen</span>
                <span className="mr-4">1/2/3: Engines</span>
                <span>A/B/S/X: Styles</span>
              </div>
            </div>
          </div>

          {/* Browser warning */}
          {!isSupported && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-auto">
              <div className="bg-[#1a1a1a] p-8 rounded-lg max-w-md text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="text-white text-xl font-mono mb-4">
                  Chrome or Edge Required
                </h2>
                <p className="text-white/70 font-mono text-sm mb-4">
                  System audio capture only works in Chrome or Edge browsers.
                  The VJ will run in demo mode with simulated audio.
                </p>
                <Link
                  href="/"
                  className="inline-block px-4 py-2 bg-[#da7756] text-black font-mono rounded hover:bg-[#e8957a] transition-colors"
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
