'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface LogEntry {
  timestamp: number;
  message: string;
}

interface CycleStatus {
  brain: string;
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

export default function WatchPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<CycleStatus | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
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

  // Fetch status and stats periodically
  useEffect(() => {
    fetchStatus();
    fetchStats();
    const interval = setInterval(() => {
      fetchStatus();
      fetchStats();
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
                message: data.message
              }]);
            } else if (data.type === 'connected' && isFirstConnect) {
              // Only show connected message once
              setLogs(prev => [...prev, {
                timestamp: data.timestamp || Date.now(),
                message: data.message
              }]);
            }
            // Ignore ping/pong messages
          } catch {
            // Handle non-JSON messages (ignore binary ping/pong)
            if (typeof event.data === 'string' && event.data.length > 0) {
              setLogs(prev => [...prev, {
                timestamp: Date.now(),
                message: event.data
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
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8">
      <div className="max-w-6xl w-full px-4 sm:px-5">
        {/* Header */}
        <header className="flex items-center gap-3 py-3 border-b border-border mb-6">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
            <span className="text-claude-orange font-semibold text-sm">Watch Dev Cook</span>
          </Link>
          <span className={`px-2 py-1 text-xs rounded ml-2 ${
            connected
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
          <span className="text-text-muted text-xs ml-auto hidden sm:inline">Real-time build logs</span>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Current Cycle */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h2 className="text-sm text-text-secondary mb-3">CURRENT CYCLE</h2>
            {status?.cycle ? (
              <div className="space-y-2">
                <div className="text-claude-orange font-bold">{status.cycle.project}</div>
                <div className="text-sm text-text-secondary">/{status.cycle.slug}</div>
                <div className="text-xs text-text-muted">
                  Status: <span className="text-green-400">{status.cycle.status}</span>
                </div>
                <div className="text-xs text-text-muted">
                  Started: {new Date(status.cycle.started).toLocaleString()}
                </div>
                <div className="text-xs text-text-muted">
                  Ends: {new Date(status.cycle.ends).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-text-muted text-sm">No active cycle</div>
            )}
          </div>

          {/* Scheduled Tweets */}
          {status?.cycle?.tweets && status.cycle.tweets.length > 0 && (
            <div className="bg-bg-secondary border border-border rounded-lg p-4">
              <h2 className="text-sm text-text-secondary mb-3">SCHEDULED TWEETS</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {status.cycle.tweets.map((tweet, i) => (
                  <div
                    key={i}
                    className={`text-xs p-2 rounded ${
                      tweet.posted
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-bg-tertiary'
                    }`}
                  >
                    <div className="text-text-secondary mb-1">
                      {new Date(tweet.scheduled_for).toLocaleString()}
                      {tweet.posted && <span className="text-green-400 ml-2">POSTED</span>}
                    </div>
                    <div className="text-text-primary line-clamp-2">{tweet.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Stats */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm text-text-secondary">DAILY STATS</h2>
              <button
                onClick={fetchStats}
                disabled={loading === 'stats'}
                className="text-xs text-claude-orange hover:text-claude-orange/80 transition disabled:opacity-50"
              >
                {loading === 'stats' ? '...' : 'Refresh'}
              </button>
            </div>
            {stats ? (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-claude-orange">
                  {stats.features_shipped}/{stats.daily_limit}
                </div>
                <div className="text-xs text-text-muted">Features shipped today</div>
                <div className="w-full bg-bg-tertiary rounded-full h-2 mt-2">
                  <div
                    className="bg-claude-orange h-2 rounded-full transition-all"
                    style={{ width: `${(stats.features_shipped / stats.daily_limit) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-text-muted mt-2">
                  {stats.can_ship_more ? (
                    stats.next_allowed_in_hours > 0 ? (
                      <span className="text-amber-400">
                        Next in {stats.next_allowed_in_hours.toFixed(1)}h
                        {stats.next_allowed_at && (
                          <span className="text-text-muted ml-1">
                            ({new Date(stats.next_allowed_at).toLocaleTimeString()})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-green-400">Ready to ship!</span>
                    )
                  ) : (
                    <span className="text-red-400">Daily limit reached</span>
                  )}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  Staggered: {stats.hours_between_cycles}h between features
                </div>
              </div>
            ) : (
              <div className="text-text-muted text-sm">Loading...</div>
            )}
          </div>

          {/* Refresh Actions */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h2 className="text-sm text-text-secondary mb-3">REFRESH</h2>
            <div className="space-y-2">
              <button
                onClick={() => { fetchStatus(); fetchStats(); }}
                disabled={loading === 'status' || loading === 'stats'}
                className="w-full px-4 py-2 bg-bg-tertiary border border-border text-text-secondary rounded text-sm hover:bg-bg-tertiary hover:text-text-primary transition disabled:opacity-50"
              >
                {loading === 'status' || loading === 'stats' ? 'Loading...' : 'REFRESH STATUS & STATS'}
              </button>
            </div>
          </div>

          {/* Connection Info */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <h2 className="text-sm text-text-secondary mb-3">CONNECTION</h2>
            <div className="space-y-1 text-xs">
              <div className="text-text-muted">
                WebSocket Clients: <span className="text-text-primary">{status?.wsClients || 0}</span>
              </div>
              <div className="text-text-muted">
                Brain Status: <span className="text-green-400">{status?.brain || 'unknown'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Log Panel */}
        <div className="lg:col-span-2">
          <div className="bg-bg-primary border border-border rounded-lg h-[60vh] min-h-[400px] flex flex-col">
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
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="text-text-muted shrink-0">{formatTime(log.timestamp)}</span>
                  <span className={`${
                    log.message.includes('---')
                      ? 'text-claude-orange'
                      : log.message.includes('Error') || log.message.includes('Failed')
                        ? 'text-red-400'
                        : log.message.includes('Success') || log.message.includes('Complete')
                          ? 'text-green-400'
                          : 'text-text-primary'
                  }`}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
        </div>

        {/* Footer */}
        <footer className="py-4 mt-6 border-t border-border text-center">
          <p className="text-text-muted text-xs">
            <Link href="/" className="text-claude-orange hover:underline">
              claudecode.wtf
            </Link>{' '}
            · 100% of fees to @bcherny
          </p>
        </footer>
      </div>
    </div>
  );
}
