'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Example modern code that's pre-filled
const EXAMPLE_CODE = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));`;

// Programming language eras with descriptions
const LANGUAGE_ERAS = [
  {
    name: 'Modern Python (2020s)',
    icon: '🐍',
    year: '2020s',
    description: 'Type hints, f-strings, and all the good stuff'
  },
  {
    name: 'ES6 JavaScript (2015)',
    icon: '⚡',
    year: '2015',
    description: 'Arrow functions and const/let everywhere'
  },
  {
    name: 'Java (1995)',
    icon: '☕',
    year: '1995',
    description: 'public static void main'
  },
  {
    name: 'C (1972)',
    icon: '⚙️',
    year: '1972',
    description: 'Pointers, malloc, and manual memory management'
  },
  {
    name: 'FORTRAN (1957)',
    icon: '📐',
    year: '1957',
    description: 'CAPITAL LETTERS AND PUNCH CARDS'
  },
  {
    name: 'Assembly (1940s)',
    icon: '🔧',
    year: '1940s',
    description: 'MOV, ADD, JMP - talking to the CPU directly'
  },
  {
    name: 'Machine Code (1940s)',
    icon: '💾',
    year: '1940s',
    description: 'Raw binary - the final form'
  },
  {
    name: 'Punch Cards (1890s)',
    icon: '🎴',
    year: '1890s',
    description: 'Physical holes in cardboard'
  }
];

// Mock translations for instant demo (no API needed)
const generateTranslations = (code: string) => {
  const translations: Record<string, string> = {
    'Modern Python (2020s)': `def fibonacci(n: int) -> int:
    """Calculate the nth Fibonacci number."""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

if __name__ == "__main__":
    result = fibonacci(10)
    print(f"Fibonacci(10) = {result}")`,

    'ES6 JavaScript (2015)': `const fibonacci = (n) => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
};

const result = fibonacci(10);
console.log(\`Fibonacci(10) = \${result}\`);`,

    'Java (1995)': `public class Fibonacci {
    public static int fibonacci(int n) {
        if (n <= 1) {
            return n;
        }
        return fibonacci(n - 1) + fibonacci(n - 2);
    }

    public static void main(String[] args) {
        int result = fibonacci(10);
        System.out.println("Fibonacci(10) = " + result);
    }
}`,

    'C (1972)': `#include <stdio.h>

int fibonacci(int n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    int result = fibonacci(10);
    printf("Fibonacci(10) = %d\\n", result);
    return 0;
}`,

    'FORTRAN (1957)': `      PROGRAM FIBONACCI
      INTEGER N, RESULT, FIB

      N = 10
      RESULT = FIB(N)
      WRITE(*,*) 'FIBONACCI(10) =', RESULT
      STOP
      END

      INTEGER FUNCTION FIB(N)
      INTEGER N
      IF (N .LE. 1) THEN
          FIB = N
      ELSE
          FIB = FIB(N-1) + FIB(N-2)
      ENDIF
      RETURN
      END`,

    'Assembly (1940s)': `; x86-64 Assembly - Fibonacci
section .data
    result_msg db "Fibonacci(10) = %d", 10, 0

section .text
    global main
    extern printf

fibonacci:
    push rbp
    mov rbp, rsp
    mov eax, edi
    cmp eax, 1
    jle .base_case

    dec edi
    call fibonacci
    push rax
    dec edi
    call fibonacci
    pop rcx
    add rax, rcx
    jmp .done

.base_case:
    ; return n

.done:
    pop rbp
    ret

main:
    mov edi, 10
    call fibonacci
    mov esi, eax
    lea rdi, [result_msg]
    xor eax, eax
    call printf
    xor eax, eax
    ret`,

    'Machine Code (1940s)': `01010101 01001000 10001001 11100101
10001001 11111000 10000011 11111000
00000001 01111110 00010010 10001111
11111111 01010000 10001001 11111000
11001001 01000001 10001000 11001110
10010000 01011000 00000001 11000001
01011001 11000011 01001000 10001101
00111101 00000000 00000000 00000000
10001001 11110110 10110000 00000000
11000101 11111111 00110001 11000000
11000011

; Fibonacci computation in pure binary
; Each byte represents machine instructions
; This would be loaded directly into memory
; and executed by the CPU`,

    'Punch Cards (1890s)': `╔════════════════════════════════════════════════════════════════╗
║  ●  ●     ●  ●  ●     ●     ●  ●        ●  ●  ●              ║
║     ●  ●  ●     ●        ●  ●              ●     ●           ║
║  ●     ●     ●  ●  ●  ●     ●  ●  ●     ●  ●        ●        ║
╠════════════════════════════════════════════════════════════════╣
║  FIBONACCI CALCULATION - CARD 1 OF 23                        ║
║  FUNCTION: FIB(N)                                            ║
║  IF N <= 1 THEN RETURN N                                     ║
╠════════════════════════════════════════════════════════════════╣
║  ●     ●  ●  ●     ●  ●     ●     ●  ●     ●                 ║
║     ●        ●  ●     ●  ●     ●        ●     ●  ●           ║
║  ●  ●  ●        ●        ●  ●  ●  ●        ●        ●        ║
╠════════════════════════════════════════════════════════════════╣
║  ELSE: RETURN FIB(N-1) + FIB(N-2)                            ║
║  CALL WITH N=10                                              ║
║  END CARD                                                    ║
╚════════════════════════════════════════════════════════════════╝

Note: Each hole represents a bit of data. You would need
approximately 23 punch cards to encode this program.`
  };

  return translations;
};

export default function TimeMachinePage() {
  const [code, setCode] = useState(EXAMPLE_CODE);
  const [currentEra, setCurrentEra] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [showAllEras, setShowAllEras] = useState(false);

  const handleTimeTravel = () => {
    if (isAnimating) return;

    // Generate all translations at once
    const allTranslations = generateTranslations(code);
    setTranslations(allTranslations);
    setIsAnimating(true);
    setShowAllEras(false);
    setCurrentEra(0);

    // Animate through eras
    let era = 0;
    const interval = setInterval(() => {
      era++;
      if (era >= LANGUAGE_ERAS.length) {
        clearInterval(interval);
        setIsAnimating(false);
        setShowAllEras(true);
        return;
      }
      setCurrentEra(era);
    }, 800);
  };

  const handleRandomExample = () => {
    const examples = [
      EXAMPLE_CODE,
      `function greet(name) {
  return \`Hello, \${name}!\`;
}`,
      `function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}`,
      `class Calculator {
  add(a, b) {
    return a + b;
  }
}`
    ];
    const randomIndex = Math.floor(Math.random() * examples.length);
    setCode(examples[randomIndex]);
  };

  const handleReset = () => {
    setCurrentEra(0);
    setIsAnimating(false);
    setTranslations({});
    setShowAllEras(false);
  };

  const currentLanguage = LANGUAGE_ERAS[currentEra];
  const currentTranslation = translations[currentLanguage.name] || code;

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-[1200px] w-[90%]">

        {/* Header */}
        <header className="flex items-center gap-3 py-3 mb-6">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">Code Time Machine</span>
          <span className="text-text-muted text-xs ml-auto hidden sm:inline">⏰ Travel through computing history</span>
        </header>

        {/* Hero Section */}
        <section className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            ⏰ Code Time Machine
          </h1>
          <p className="text-text-secondary text-sm sm:text-base">
            Watch your modern code evolve backwards through computing history
          </p>
          <p className="text-text-muted text-xs mt-2">
            From Python to COBOL to punch cards to literal machine code
          </p>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* Left Panel - Input */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-text-secondary text-xs uppercase tracking-wider">
                Your Modern Code
              </label>
              <button
                onClick={handleRandomExample}
                className="text-xs text-claude-orange hover:text-claude-orange/80 transition-colors"
              >
                🎲 Random Example
              </button>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-64 bg-bg-primary border border-border rounded-md px-3 py-3 font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none"
              placeholder="// Paste your modern code here..."
            />
            <div className="mt-4 space-y-2">
              <button
                onClick={handleTimeTravel}
                disabled={isAnimating || !code.trim()}
                className="w-full bg-claude-orange text-white font-semibold py-3 px-6 rounded-md text-sm hover:bg-claude-orange/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {isAnimating ? '⏳ Time Traveling...' : '⏰ Start Time Travel'}
              </button>
              {Object.keys(translations).length > 0 && (
                <button
                  onClick={handleReset}
                  className="w-full bg-bg-tertiary border border-border text-text-primary px-3 py-2 rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors"
                >
                  🔄 Reset
                </button>
              )}
            </div>
          </div>

          {/* Right Panel - Output */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentLanguage.icon}</span>
                <div>
                  <div className="text-text-secondary text-xs uppercase tracking-wider">
                    {currentLanguage.name}
                  </div>
                  <div className="text-text-muted text-xs">
                    {currentLanguage.year} · {currentLanguage.description}
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <pre className="w-full h-64 bg-bg-primary border border-border rounded-md px-3 py-3 font-mono text-xs text-text-primary overflow-auto">
                {currentTranslation}
              </pre>
              {isAnimating && (
                <div className="absolute inset-0 bg-bg-primary/50 backdrop-blur-sm flex items-center justify-center rounded-md">
                  <div className="text-claude-orange text-sm animate-pulse">
                    ⏳ Translating to {currentLanguage.year}...
                  </div>
                </div>
              )}
            </div>

            {/* Era Progress Bar */}
            {Object.keys(translations).length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-muted text-xs">Time Travel Progress</span>
                  <span className="text-text-muted text-xs">
                    {currentEra + 1} / {LANGUAGE_ERAS.length}
                  </span>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-2">
                  <div
                    className="bg-claude-orange h-2 rounded-full transition-all duration-500"
                    style={{ width: `${((currentEra + 1) / LANGUAGE_ERAS.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* All Eras Display */}
        {showAllEras && (
          <div className="bg-bg-secondary border border-claude-orange/50 rounded-lg p-4 mb-4">
            <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
              <span>🎯</span>
              <span>Complete Time Travel Journey</span>
            </h3>
            <div className="space-y-4">
              {LANGUAGE_ERAS.map((era, index) => (
                <div
                  key={era.name}
                  className="bg-bg-primary border border-border rounded-lg p-3 cursor-pointer hover:border-claude-orange transition-colors"
                  onClick={() => setCurrentEra(index)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{era.icon}</span>
                    <div className="flex-1">
                      <div className="text-text-secondary text-sm font-semibold">
                        {era.name}
                      </div>
                      <div className="text-text-muted text-xs">
                        {era.year} · {era.description}
                      </div>
                    </div>
                  </div>
                  <pre className="text-xs text-text-primary font-mono bg-bg-tertiary rounded p-2 overflow-x-auto max-h-32 overflow-y-auto">
                    {translations[era.name]?.split('\n').slice(0, 8).join('\n') +
                     (translations[era.name]?.split('\n').length > 8 ? '\n...' : '')}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline Visualization */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-4">
          <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-4">
            Computing History Timeline
          </h3>
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-0 right-0 top-6 h-0.5 bg-border" />

            {/* Timeline Points */}
            <div className="relative flex justify-between items-start">
              {LANGUAGE_ERAS.map((era, index) => (
                <div
                  key={era.name}
                  className="flex flex-col items-center gap-1 flex-1"
                  style={{ zIndex: LANGUAGE_ERAS.length - index }}
                >
                  <button
                    onClick={() => {
                      if (Object.keys(translations).length > 0) {
                        setCurrentEra(index);
                      }
                    }}
                    disabled={Object.keys(translations).length === 0}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index <= currentEra && Object.keys(translations).length > 0
                        ? 'bg-claude-orange scale-125'
                        : 'bg-border hover:bg-border/70'
                    } ${Object.keys(translations).length === 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  />
                  <div className="text-xs text-center mt-2 hidden lg:block">
                    <div className="text-text-muted">{era.icon}</div>
                    <div className="text-text-muted text-[10px] mt-1">{era.year}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🕰️</div>
            <div className="text-text-secondary text-xs font-semibold mb-1">8 Eras</div>
            <div className="text-text-muted text-xs">From 2020s to 1890s</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🚀</div>
            <div className="text-text-secondary text-xs font-semibold mb-1">Instant</div>
            <div className="text-text-muted text-xs">No waiting, pure fun</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🎓</div>
            <div className="text-text-secondary text-xs font-semibold mb-1">Educational</div>
            <div className="text-text-muted text-xs">Learn computing history</div>
          </div>
        </div>

        {/* Fun Facts */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-3">
            🤓 Fun Facts About Computing History
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="text-text-muted">
              <span className="text-claude-orange">•</span> FORTRAN is still used in scientific computing today
            </div>
            <div className="text-text-muted">
              <span className="text-claude-orange">•</span> Assembly language is different for each CPU architecture
            </div>
            <div className="text-text-muted">
              <span className="text-claude-orange">•</span> Punch cards could hold about 80 characters each
            </div>
            <div className="text-text-muted">
              <span className="text-claude-orange">•</span> Early computers were programmed by literally rewiring them
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
