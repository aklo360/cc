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
  next_allowed_in_ms: number;
  next_allowed_in_mins: number;
}

// Brain server URL - configurable via env
const BRAIN_URL = process.env.NEXT_PUBLIC_BRAIN_URL || 'http://localhost:3001';
const BRAIN_WS_URL = process.env.NEXT_PUBLIC_BRAIN_WS_URL || 'ws://localhost:3001/ws';

export default function WatchPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<CycleStatus | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

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

  const startCycle = async () => {
    setLoading('go');
    try {
      const res = await fetch(`${BRAIN_URL}/go`, { method: 'POST' });
      if (res.ok) {
        setLogs(prev => [...prev, {
          timestamp: Date.now(),
          message: '--- Cycle started! ---'
        }]);
        fetchStatus();
        fetchStats();
      }
    } catch {
      setLogs(prev => [...prev, {
        timestamp: Date.now(),
        message: '--- Failed to start cycle ---'
      }]);
    }
    setLoading(null);
  };

  const cancelCycle = async () => {
    setLoading('cancel');
    try {
      const res = await fetch(`${BRAIN_URL}/cancel`, { method: 'POST' });
      if (res.ok) {
        setLogs(prev => [...prev, {
          timestamp: Date.now(),
          message: '--- Cycle cancelled ---'
        }]);
        fetchStatus();
        fetchStats();
      }
    } catch {
      setLogs(prev => [...prev, {
        timestamp: Date.now(),
        message: '--- Failed to cancel cycle ---'
      }]);
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
    <main className="min-h-screen bg-[#0d0d0d] text-[#e0e0e0] font-mono">
      {/* Header */}
      <header className="border-b border-[#262626] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[#da7756] hover:underline">
              &larr; Back
            </Link>
            <h1 className="text-xl font-bold">Central Brain</h1>
            <span className={`px-2 py-1 text-xs rounded ${
              connected
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {connected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <div className="text-xs text-[#666]">
            View Only
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Current Cycle */}
          <div className="bg-[#1a1a1a] border border-[#262626] rounded-lg p-4">
            <h2 className="text-sm text-[#a0a0a0] mb-3">CURRENT CYCLE</h2>
            {status?.cycle ? (
              <div className="space-y-2">
                <div className="text-[#da7756] font-bold">{status.cycle.project}</div>
                <div className="text-sm text-[#a0a0a0]">/{status.cycle.slug}</div>
                <div className="text-xs text-[#666]">
                  Status: <span className="text-green-400">{status.cycle.status}</span>
                </div>
                <div className="text-xs text-[#666]">
                  Started: {new Date(status.cycle.started).toLocaleString()}
                </div>
                <div className="text-xs text-[#666]">
                  Ends: {new Date(status.cycle.ends).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-[#666] text-sm">No active cycle</div>
            )}
          </div>

          {/* Scheduled Tweets */}
          {status?.cycle?.tweets && status.cycle.tweets.length > 0 && (
            <div className="bg-[#1a1a1a] border border-[#262626] rounded-lg p-4">
              <h2 className="text-sm text-[#a0a0a0] mb-3">SCHEDULED TWEETS</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {status.cycle.tweets.map((tweet, i) => (
                  <div
                    key={i}
                    className={`text-xs p-2 rounded ${
                      tweet.posted
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-[#262626]'
                    }`}
                  >
                    <div className="text-[#a0a0a0] mb-1">
                      {new Date(tweet.scheduled_for).toLocaleString()}
                      {tweet.posted && <span className="text-green-400 ml-2">POSTED</span>}
                    </div>
                    <div className="text-[#e0e0e0] line-clamp-2">{tweet.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Stats */}
          <div className="bg-[#1a1a1a] border border-[#262626] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm text-[#a0a0a0]">DAILY STATS</h2>
              <button
                onClick={fetchStats}
                disabled={loading === 'stats'}
                className="text-xs text-[#da7756] hover:text-[#e88866] transition disabled:opacity-50"
              >
                {loading === 'stats' ? '...' : 'Refresh'}
              </button>
            </div>
            {stats ? (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-[#da7756]">
                  {stats.features_shipped}/{stats.daily_limit}
                </div>
                <div className="text-xs text-[#666]">Features shipped today</div>
                <div className="w-full bg-[#262626] rounded-full h-2 mt-2">
                  <div
                    className="bg-[#da7756] h-2 rounded-full transition-all"
                    style={{ width: `${(stats.features_shipped / stats.daily_limit) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-[#666] mt-2">
                  {stats.can_ship_more ? (
                    stats.next_allowed_in_mins > 0 ? (
                      <span className="text-amber-400">Next in {stats.next_allowed_in_mins}m</span>
                    ) : (
                      <span className="text-green-400">Ready to ship!</span>
                    )
                  ) : (
                    <span className="text-red-400">Daily limit reached</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-[#666] text-sm">Loading...</div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-[#1a1a1a] border border-[#262626] rounded-lg p-4">
            <h2 className="text-sm text-[#a0a0a0] mb-3">ACTIONS</h2>
            <div className="space-y-2">
              <button
                onClick={startCycle}
                disabled={loading === 'go' || !!status?.cycle}
                className="w-full px-4 py-2 bg-green-500/20 border border-green-500/40 text-green-400 rounded text-sm font-semibold hover:bg-green-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'go' ? 'Starting...' : status?.cycle ? 'Cycle Active' : 'START CYCLE'}
              </button>
              <button
                onClick={cancelCycle}
                disabled={loading === 'cancel' || !status?.cycle}
                className="w-full px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 rounded text-sm font-semibold hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'cancel' ? 'Cancelling...' : 'CANCEL CYCLE'}
              </button>
              <button
                onClick={fetchStatus}
                disabled={loading === 'status'}
                className="w-full px-4 py-2 bg-[#262626] border border-[#333] text-[#a0a0a0] rounded text-sm hover:bg-[#333] transition disabled:opacity-50"
              >
                {loading === 'status' ? 'Loading...' : 'REFRESH STATUS'}
              </button>
            </div>
          </div>

          {/* Connection Info */}
          <div className="bg-[#1a1a1a] border border-[#262626] rounded-lg p-4">
            <h2 className="text-sm text-[#a0a0a0] mb-3">CONNECTION</h2>
            <div className="space-y-1 text-xs">
              <div className="text-[#666]">
                WebSocket Clients: <span className="text-[#e0e0e0]">{status?.wsClients || 0}</span>
              </div>
              <div className="text-[#666]">
                Brain Status: <span className="text-green-400">{status?.brain || 'unknown'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Log Panel */}
        <div className="lg:col-span-2">
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg h-[calc(100vh-200px)] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#262626]">
              <h2 className="text-sm text-[#a0a0a0]">BUILD LOGS</h2>
              <button
                onClick={() => setLogs([])}
                className="text-xs text-[#666] hover:text-[#a0a0a0] transition"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {error && (
                <div className="text-red-400 text-sm mb-4">
                  {error}
                  <div className="text-[#666] text-xs mt-1">
                    Make sure the Central Brain is running on port 3001
                  </div>
                </div>
              )}
              {logs.length === 0 && !error && (
                <div className="text-[#666] text-sm">
                  Waiting for logs...
                  <div className="text-xs mt-1">
                    Click &quot;START CYCLE&quot; to begin an autonomous build cycle
                  </div>
                </div>
              )}
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="text-[#666] shrink-0">{formatTime(log.timestamp)}</span>
                  <span className={`${
                    log.message.includes('---')
                      ? 'text-[#da7756]'
                      : log.message.includes('Error') || log.message.includes('Failed')
                        ? 'text-red-400'
                        : log.message.includes('Success') || log.message.includes('Complete')
                          ? 'text-green-400'
                          : 'text-[#e0e0e0]'
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
    </main>
  );
}
