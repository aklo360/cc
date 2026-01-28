'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function AutopsyPage() {
  const [code, setCode] = useState(`function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i <= items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total.toFixed(2);
}

// Usage
const cart = [
  { price: 10, quantity: 2 },
  { price: 15, quantity: 1 }
];
console.log(calculateTotal(cart));`);

  const [error, setError] = useState('TypeError: Cannot read property "price" of undefined');
  const [report, setReport] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const performAutopsy = () => {
    setAnalyzing(true);

    // Simulate analysis delay
    setTimeout(() => {
      // Generate forensic report
      const autopsyReport = {
        timeOfDeath: new Date().toLocaleString(),
        causeOfDeath: 'Off-by-one error leading to undefined property access',
        severity: 'Fatal',
        bugType: 'Logic Error',
        timeline: [
          { time: '0ms', event: 'Function calculateTotal() invoked with 2-item array', status: 'ok' },
          { time: '1ms', event: 'Loop initialized: i = 0, condition: i <= items.length (i <= 2)', status: 'warning' },
          { time: '2ms', event: 'Iteration 0: Accessing items[0] - SUCCESS', status: 'ok' },
          { time: '3ms', event: 'Iteration 1: Accessing items[1] - SUCCESS', status: 'ok' },
          { time: '4ms', event: 'Iteration 2: Accessing items[2] - undefined', status: 'error' },
          { time: '4ms', event: 'Attempting to read property "price" of undefined', status: 'fatal' },
          { time: '4ms', event: 'TypeError thrown, execution halted', status: 'fatal' }
        ],
        diagnosis: {
          primary: 'Loop boundary condition uses <= instead of <',
          secondary: 'Array indices are 0-based, but loop runs from 0 to length (inclusive)',
          impact: 'Attempts to access items[2] when array only has indices 0 and 1'
        },
        autopsy: {
          evidence: [
            '🔍 Loop condition: i <= items.length evaluates to i <= 2',
            '⚠️ Valid array indices: 0, 1 (length is 2)',
            '💥 Fatal access attempt: items[2] returns undefined',
            '🚨 Property access on undefined causes TypeError'
          ],
          contributing_factors: [
            'No bounds checking before property access',
            'No null/undefined guard',
            'Classic off-by-one error pattern'
          ]
        },
        treatment: {
          immediate: 'Change loop condition from i <= items.length to i < items.length',
          preventive: [
            'Use Array.prototype methods (forEach, map, reduce) instead of manual loops',
            'Add defensive null checks before property access',
            'Enable strict TypeScript checks',
            'Add runtime validation for array bounds'
          ],
          correctedCode: `function calculateTotal(items) {
  let total = 0;
  // FIXED: Changed <= to <
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total.toFixed(2);
}

// BETTER: Use reduce to avoid manual indexing
function calculateTotalSafe(items) {
  const total = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  return total.toFixed(2);
}`
        },
        prognosis: 'Full recovery expected with one-character fix. Future incidents preventable with modern array methods.'
      };

      setReport(autopsyReport);
      setAnalyzing(false);
    }, 1500);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'fatal': return 'text-[#ff5f57]';
      case 'error': return 'text-[#ff5f57]';
      case 'warning': return 'text-[#febc2e]';
      case 'ok': return 'text-[#28c840]';
      default: return 'text-text-primary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return '✓';
      case 'warning': return '⚠';
      case 'error': return '✗';
      case 'fatal': return '💀';
      default: return '•';
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-[1200px] w-[90%]">

        <header className="flex items-center gap-3 py-3 mb-6">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">Claude's Code Autopsy</span>
          <span className="text-text-muted text-xs ml-auto">Forensic code analysis</span>
        </header>

        <div className="space-y-4">
          {/* Code Input */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
              💀 Deceased Code (Paste the victim here)
            </label>
            <textarea
              className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none"
              rows={12}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your broken code here..."
            />
          </div>

          {/* Error Input */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
              🚨 Error Message / Crash Report
            </label>
            <input
              type="text"
              className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors"
              value={error}
              onChange={(e) => setError(e.target.value)}
              placeholder="TypeError: Cannot read property 'x' of undefined"
            />
          </div>

          {/* Analyze Button */}
          <button
            onClick={performAutopsy}
            disabled={analyzing}
            className="w-full bg-claude-orange text-white font-semibold py-3 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? '🔬 Performing Autopsy...' : '🔬 Perform Autopsy'}
          </button>

          {/* Report */}
          {report && (
            <div className="space-y-4 mt-6">
              {/* Header */}
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <h2 className="text-claude-orange font-semibold text-lg mb-3">📋 Forensic Report</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-text-secondary">Time of Death:</span>
                    <span className="text-text-primary ml-2 font-mono">{report.timeOfDeath}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Severity:</span>
                    <span className={`ml-2 font-semibold ${getSeverityColor(report.severity)}`}>{report.severity}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-secondary">Cause of Death:</span>
                    <span className="text-text-primary ml-2">{report.causeOfDeath}</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
                  ⏱️ Timeline of Events
                </label>
                <div className="space-y-2">
                  {report.timeline.map((event: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="text-text-muted font-mono text-xs min-w-[40px]">{event.time}</span>
                      <span className={getSeverityColor(event.status)}>{getStatusIcon(event.status)}</span>
                      <span className="text-text-primary flex-1">{event.event}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diagnosis */}
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
                  🔬 Diagnosis
                </label>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-text-secondary">Primary Cause:</span>
                    <p className="text-text-primary mt-1">{report.diagnosis.primary}</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Secondary Factor:</span>
                    <p className="text-text-primary mt-1">{report.diagnosis.secondary}</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Impact:</span>
                    <p className="text-text-primary mt-1">{report.diagnosis.impact}</p>
                  </div>
                </div>
              </div>

              {/* Evidence */}
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
                  🔍 Evidence & Contributing Factors
                </label>
                <div className="space-y-3">
                  <div>
                    <p className="text-text-secondary text-xs mb-2">Physical Evidence:</p>
                    <ul className="space-y-1">
                      {report.autopsy.evidence.map((e: string, i: number) => (
                        <li key={i} className="text-text-primary text-sm font-mono">{e}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-text-secondary text-xs mb-2">Contributing Factors:</p>
                    <ul className="space-y-1">
                      {report.autopsy.contributing_factors.map((f: string, i: number) => (
                        <li key={i} className="text-text-primary text-sm">• {f}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Treatment */}
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
                  💊 Treatment & Prevention
                </label>
                <div className="space-y-3">
                  <div>
                    <p className="text-text-secondary text-xs mb-2">Immediate Fix:</p>
                    <p className="text-text-primary text-sm bg-bg-primary border border-border rounded px-3 py-2 font-mono">
                      {report.treatment.immediate}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-xs mb-2">Preventive Measures:</p>
                    <ul className="space-y-1">
                      {report.treatment.preventive.map((p: string, i: number) => (
                        <li key={i} className="text-text-primary text-sm">• {p}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-text-secondary text-xs mb-2">Corrected Code:</p>
                    <pre className="text-text-primary text-sm bg-bg-primary border border-border rounded px-3 py-2 font-mono overflow-x-auto whitespace-pre">
{report.treatment.correctedCode}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Prognosis */}
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
                  📊 Prognosis
                </label>
                <p className="text-text-primary text-sm">{report.prognosis}</p>
              </div>

              {/* New Case Button */}
              <button
                onClick={() => setReport(null)}
                className="w-full bg-bg-tertiary border border-border text-text-primary px-3 py-2 rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors"
              >
                📝 Analyze Another Case
              </button>
            </div>
          )}
        </div>

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
