'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface LogEntry {
  timestamp: number;
  message: string;
  activityType?: 'build' | 'meme' | 'system';
}

interface CycleStatus {
  brain: string;
  mode: 'building' | 'resting' | 'idle';
  wsClients: number;
  cycle: {
    id: number;
    status: string;
    project: string;
    slug: string;
    started: string;
    ends: string;
    tweets: Array<{
      content: string;
      scheduled_for: string;
      posted: boolean;
    }>;
  } | null;
  cooldown?: {
    next_allowed_in_ms: number;
    next_allowed_at: string | null;
  };
  memes?: {
    daily_count: number;
    daily_limit: number;
    can_post: boolean;
    next_allowed_in_ms: number;
    in_progress: boolean;
  };
}

interface DailyStats {
  date: string;
  features_shipped: number;
  daily_limit: number;
  remaining: number;
  can_ship_more: boolean;
  last_cycle_end: string | null;
  hours_between_cycles: number;
  next_allowed_in_ms: number;
  next_allowed_in_hours: number;
  next_allowed_at: string | null;
}

interface ShippedFeature {
  slug: string;
  name: string;
  description: string;
  url: string;
  shipped_at: string;
}

interface FeaturesData {
  total: number;
  features: ShippedFeature[];
}

interface ScheduledTweet {
  id?: number;
  content: string;
  scheduled_for: string;
  posted: boolean;
  source: 'brain-video' | 'brain-cycle';
}

interface ScheduledTweetsData {
  video_tweets: ScheduledTweet[];
  cycle_tweets: ScheduledTweet[];
  total_pending: number;
}

// Brain server URL - production uses brain.claudecode.wtf
const IS_PRODUCTION = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
const BRAIN_URL = IS_PRODUCTION ? 'https://brain.claudecode.wtf' : 'http://localhost:3001';
const BRAIN_WS_URL = IS_PRODUCTION ? 'wss://brain.claudecode.wtf/ws' : 'ws://localhost:3001/ws';

// LocalStorage key for caching logs
const LOGS_CACHE_KEY = 'cc-brain-logs';
const LOGS_CACHE_DATE_KEY = 'cc-brain-logs-date';

// Get today's date string for cache invalidation
const getTodayDate = () => new Date().toISOString().split('T')[0];

// Load cached logs from localStorage
const loadCachedLogs = (): LogEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const cachedDate = localStorage.getItem(LOGS_CACHE_DATE_KEY);
    // Only use cache if it's from today
    if (cachedDate === getTodayDate()) {
      const cached = localStorage.getItem(LOGS_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } else {
      // Clear old cache
      localStorage.removeItem(LOGS_CACHE_KEY);
      localStorage.removeItem(LOGS_CACHE_DATE_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
  return [];
};

// Save logs to localStorage
const saveCachedLogs = (logs: LogEntry[]) => {
  if (typeof window === 'undefined') return;
  try {
    // Keep only last 500 logs to prevent localStorage overflow
    const logsToSave = logs.slice(-500);
    localStorage.setItem(LOGS_CACHE_KEY, JSON.stringify(logsToSave));
    localStorage.setItem(LOGS_CACHE_DATE_KEY, getTodayDate());
  } catch {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
};

function WatchPageContent() {
  const searchParams = useSearchParams();
  const isLiteMode = searchParams.get('lite') === '1';

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<CycleStatus | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [features, setFeatures] = useState<FeaturesData | null>(null);
  const [scheduledTweets, setScheduledTweets] = useState<ScheduledTweetsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Load cached logs on mount
  useEffect(() => {
    const cached = loadCachedLogs();
    if (cached.length > 0) {
      setLogs(cached);
    }
  }, []);

  // Save logs to cache whenever they change
  useEffect(() => {
    if (logs.length > 0) {
      saveCachedLogs(logs);
    }
  }, [logs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Fetch status and stats
  const fetchStatus = async () => {
    setLoading('status');
    try {
      const res = await fetch(`${BRAIN_URL}/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Status endpoint might not be available yet
    }
    setLoading(null);
  };

  const fetchStats = async () => {
    setLoading('stats');
    try {
      const res = await fetch(`${BRAIN_URL}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Stats endpoint might not be available yet
    }
    setLoading(null);
  };

  const fetchFeatures = async () => {
    try {
      const res = await fetch(`${BRAIN_URL}/features`);
      if (res.ok) {
        const data = await res.json();
        setFeatures(data);
      }
    } catch {
      // Features endpoint might not be available yet
    }
  };

  const fetchScheduledTweets = async () => {
    try {
      const res = await fetch(`${BRAIN_URL}/scheduled-tweets`);
      if (res.ok) {
        const data = await res.json();
        setScheduledTweets(data);
      }
    } catch {
      // Scheduled tweets endpoint might not be available yet
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${BRAIN_URL}/logs`);
      if (res.ok) {
        const data = await res.json();
        if (data.logs && data.logs.length > 0) {
          // Convert API logs to LogEntry format
          const historicalLogs: LogEntry[] = data.logs.map((l: { message: string; timestamp: number; activityType?: string }) => ({
            timestamp: l.timestamp,
            message: l.message,
            activityType: (l.activityType || 'system') as 'build' | 'meme' | 'system',
          }));
          // Only set if we don't have logs yet (initial load)
          setLogs(prev => {
            if (prev.length === 0 || (prev.length === 1 && prev[0].message.includes('Connected'))) {
              return historicalLogs;
            }
            return prev;
          });
        }
      }
    } catch {
      // Logs endpoint might not be available yet
    }
  };

  // Fetch historical logs on mount
  useEffect(() => {
    fetchLogs();
  }, []);

  // Fetch all data periodically
  useEffect(() => {
    fetchStatus();
    fetchStats();
    fetchFeatures();
    fetchScheduledTweets();
    const interval = setInterval(() => {
      fetchStatus();
      fetchStats();
      fetchFeatures();
      fetchScheduledTweets();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket connection
  useEffect(() => {
    let reconnectAttempts = 0;
    let isFirstConnect = true;

    const connectWs = () => {
      try {
        const ws = new WebSocket(BRAIN_WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          setError(null);
          reconnectAttempts = 0;
          // Only log connection message on first connect
          if (isFirstConnect) {
            setLogs(prev => [...prev, {
              timestamp: Date.now(),
              message: '--- Connected to Central Brain ---'
            }]);
            isFirstConnect = false;
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'log') {
              setLogs(prev => [...prev, {
                timestamp: data.timestamp || Date.now(),
                message: data.message,
                activityType: data.activityType || 'system',
              }]);
            } else if (data.type === 'connected' && isFirstConnect) {
              // Only show connected message once
              setLogs(prev => [...prev, {
                timestamp: data.timestamp || Date.now(),
                message: data.message,
                activityType: 'system',
              }]);
            }
            // Ignore ping/pong messages
          } catch {
            // Handle non-JSON messages (ignore binary ping/pong)
            if (typeof event.data === 'string' && event.data.length > 0) {
              setLogs(prev => [...prev, {
                timestamp: Date.now(),
                message: event.data,
                activityType: 'system',
              }]);
            }
          }
        };

        ws.onclose = () => {
          setConnected(false);
          reconnectAttempts++;
          // Only log disconnect after multiple failed attempts
          if (reconnectAttempts > 3) {
            setLogs(prev => [...prev, {
              timestamp: Date.now(),
              message: '--- Connection lost, reconnecting... ---'
            }]);
          }
          // Exponential backoff with max 30s
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000);
          setTimeout(connectWs, delay);
        };

        ws.onerror = () => {
          setError('Failed to connect to Central Brain');
          setConnected(false);
        };
      } catch {
        setError('WebSocket not available');
      }
    };

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-6xl w-[90%]">
        {/* Header */}
        <header className="flex items-center gap-3 py-3 mb-6">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">Watch Dev Cook</span>
          <span className={`px-2 py-1 text-xs rounded ml-2 ${
            connected
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
          <span className="text-text-muted text-xs ml-auto hidden sm:inline">Real-time build logs</span>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh] min-h-[500px]">
        {/* Status Panel */}
        <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto">
          {/* Stats Row - Two Columns */}
          <div className="bg-bg-secondary border border-claude-orange/30 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Left: Total Features */}
              <div>
                <h2 className="text-sm text-text-secondary mb-2">FEATURES SHIPPED</h2>
                <div className="text-4xl font-bold text-claude-orange">
                  {features?.total ?? '...'}
                </div>
                <div className="text-xs text-text-muted mt-1">autonomous builds</div>
              </div>

              {/* Right: Current Status */}
              <div className="border-l border-border pl-4">
                <h2 className="text-sm text-text-secondary mb-2">STATUS</h2>
                {status?.mode === 'building' && status?.cycle ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">BUILDING</span>
                    </div>
                    <div className="text-claude-orange font-bold text-sm truncate">{status.cycle.project}</div>
                    <div className="text-xs text-text-secondary">/{status.cycle.slug}</div>
                  </div>
                ) : status?.mode === 'resting' ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-fuchsia-500/20 text-fuchsia-400">RESTING</span>
                    </div>
                    <div className="text-fuchsia-400 text-sm">Generating memes</div>
                    <div className="text-xs text-text-muted">
                      {status.memes?.daily_count ?? 0}/{status.memes?.daily_limit ?? 16} memes today
                    </div>
                    {stats && stats.next_allowed_in_hours > 0 && (
                      <div className="text-xs text-fuchsia-400/70">
                        Next build in {stats.next_allowed_in_hours.toFixed(1)}h
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">IDLE</span>
                    </div>
                    <div className="text-text-muted text-sm">Ready to build</div>
                    {stats?.can_ship_more ? (
                      <div className="text-xs text-green-400">Can start cycle</div>
                    ) : (
                      <div className="text-xs text-amber-400">Daily limit reached</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Latest Feature - Full Width Below */}
            {features?.features[0] && (
              <div className="border-t border-border pt-3 mt-3">
                <div className="text-xs text-text-secondary mb-2">LATEST FEATURE</div>
                <a
                  href={features.features[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-claude-orange/10 border border-claude-orange/30 rounded-lg p-3 hover:bg-claude-orange/20 hover:border-claude-orange/50 transition group"
                >
                  <div className="text-lg text-claude-orange font-bold group-hover:underline">{features.features[0].name}</div>
                  <div className="text-sm text-text-secondary mt-1">{features.features[0].description}</div>
                  <div className="text-base text-claude-orange font-mono mt-2 flex items-center gap-2">
                    <span className="bg-claude-orange text-white px-2 py-0.5 rounded text-sm">TRY IT</span>
                    {features.features[0].url.replace('https://', '')}
                  </div>
                </a>
              </div>
            )}
          </div>

          {/* All Scheduled Tweets - Combined (max 2 shown) */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm text-text-secondary">UPCOMING TWEETS</h2>
              {scheduledTweets && scheduledTweets.total_pending > 0 && (
                <span className="text-xs text-claude-orange">{scheduledTweets.total_pending} pending</span>
              )}
            </div>
            <div className="space-y-2">
              {(() => {
                if (!scheduledTweets) return <div className="text-text-muted text-sm">Loading...</div>;

                // Combine all tweets, filter unposted, sort by date, take first 2
                const allTweets = [
                  ...scheduledTweets.video_tweets.map(t => ({ ...t, type: 'video' as const })),
                  ...scheduledTweets.cycle_tweets.map(t => ({ ...t, type: 'cycle' as const })),
                ]
                  .filter(t => !t.posted)
                  .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
                  .slice(0, 2);

                if (allTweets.length === 0) {
                  return <div className="text-text-muted text-sm">No scheduled tweets</div>;
                }

                return allTweets.map((tweet, i) => (
                  <div
                    key={`tweet-${i}`}
                    className="text-xs p-2 rounded bg-bg-tertiary border border-border"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-text-muted">
                        {new Date(tweet.scheduled_for).toLocaleString()}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        tweet.type === 'video'
                          ? 'bg-fuchsia-500/20 text-fuchsia-400'
                          : 'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {tweet.type === 'video' ? 'VIDEO' : 'CYCLE'}
                      </span>
                    </div>
                    <div className="text-text-primary line-clamp-2">{tweet.content}</div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* GMGN Price Chart - 1h candles (1s/5m were crashing headless Chrome) */}
          <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <h2 className="text-sm text-text-secondary">$CC PRICE</h2>
              <a
                href="https://gmgn.ai/sol/token/Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-claude-orange hover:underline"
              >
                Trade on GMGN →
              </a>
            </div>
            <iframe
              src="https://www.gmgn.cc/kline/sol/Hg23qBLJDvhQtGLHMvot7NK54qAhzQFj9BVd5jpABAGS?theme=dark&interval=1h&range=1d"
              className="w-full h-[280px] border-0"
              title="$CC Price Chart"
              allow="clipboard-write"
            />
          </div>
        </div>

        {/* Log Panel */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <div className="bg-bg-primary border border-border rounded-lg flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <h2 className="text-sm text-text-secondary">BUILD LOGS</h2>
              <button
                onClick={() => {
                  setLogs([]);
                  // Also clear cache
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem(LOGS_CACHE_KEY);
                    localStorage.removeItem(LOGS_CACHE_DATE_KEY);
                  }
                }}
                className="text-xs text-text-muted hover:text-text-secondary transition"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {error && (
                <div className="text-red-400 text-sm mb-4">
                  {error}
                  <div className="text-text-muted text-xs mt-1">
                    Make sure the Central Brain is running on port 3001
                  </div>
                </div>
              )}
              {logs.length === 0 && !error && (
                <div className="text-text-muted text-sm">
                  Waiting for logs...
                  <div className="text-xs mt-1">
                    Logs will appear when the Central Brain is building
                  </div>
                </div>
              )}
              {logs.map((log, i) => {
                const isClaudeAgent = log.message.includes('[CLAUDE_AGENT');
                const isMemeActivity = log.activityType === 'meme' || log.message.startsWith('🎨');
                let activityEmoji = '🔧';
                let displayMessage = log.message;

                if (isClaudeAgent) {
                  if (log.message.includes('[CLAUDE_AGENT:PLANNING]')) {
                    activityEmoji = '📝';
                    displayMessage = log.message.replace('[CLAUDE_AGENT:PLANNING] ', '');
                  } else if (log.message.includes('[CLAUDE_AGENT:BUILDING]')) {
                    activityEmoji = '🔧';
                    displayMessage = log.message.replace('[CLAUDE_AGENT:BUILDING] ', '');
                  } else if (log.message.includes('[CLAUDE_AGENT:VERIFYING]')) {
                    activityEmoji = '🔍';
                    displayMessage = log.message.replace('[CLAUDE_AGENT:VERIFYING] ', '');
                  } else {
                    displayMessage = log.message.replace(/\[CLAUDE_AGENT[^\]]*\]\s*/, '');
                  }
                }

                return (
                  <div key={i} className="flex gap-3 text-sm items-center">
                    <span className="text-text-muted shrink-0">{formatTime(log.timestamp)}</span>
                    {isMemeActivity ? (
                      <span className="text-fuchsia-400 flex items-center gap-1.5">
                        <img src="/cc.png" alt="" className="w-4 h-4 inline-block opacity-80" />
                        <span>{displayMessage}</span>
                      </span>
                    ) : isClaudeAgent ? (
                      <span className="text-claude-orange flex items-center gap-1.5">
                        <img src="/cc.png" alt="" className="w-4 h-4 inline-block" />
                        <span>{displayMessage}</span>
                        <span>{activityEmoji}</span>
                      </span>
                    ) : (
                      <span className={`${
                        log.message.includes('---')
                          ? 'text-claude-orange'
                          : log.message.includes('Error') || log.message.includes('Failed')
                            ? 'text-red-400'
                            : log.message.includes('Success') || log.message.includes('Complete')
                              ? 'text-green-400'
                              : 'text-text-primary'
                      }`}>
                        {displayMessage}
                      </span>
                    )}
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
        </div>

        {/* Footer */}
        <footer className="py-4 mt-6 text-center">
          <Link href="/" className="text-claude-orange hover:underline text-sm">
            ← back
          </Link>
          <p className="text-text-muted text-xs mt-2">
            claudecode.wtf · 100% of fees to @bcherny
          </p>
        </footer>
      </div>
    </div>
  );
}

// Wrapper component with Suspense boundary for useSearchParams
export default function WatchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    }>
      <WatchPageContent />
    </Suspense>
  );
}
