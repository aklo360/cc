"use client";

import { useState, useEffect } from "react";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  language: string;
  theme: "dark" | "light";
}

export default function CodeEditor({ code, onChange, language, theme }: CodeEditorProps) {
  const [lineNumbers, setLineNumbers] = useState<number[]>([]);

  useEffect(() => {
    const lines = code.split('\n').length;
    setLineNumbers(Array.from({ length: lines }, (_, i) => i + 1));
  }, [code]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      onChange(newCode);
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const bgColor = theme === 'dark' ? 'bg-bg-primary' : 'bg-white';
  const textColor = theme === 'dark' ? 'text-text-primary' : 'text-gray-900';
  const lineNumberColor = theme === 'dark' ? 'text-text-muted' : 'text-gray-400';
  const borderColor = theme === 'dark' ? 'border-border' : 'border-gray-300';

  return (
    <div className={`h-full flex ${bgColor} ${textColor}`}>
      {/* Line Numbers */}
      <div className={`px-4 py-4 ${bgColor} border-r ${borderColor} select-none shrink-0`}>
        {lineNumbers.map((num) => (
          <div key={num} className={`text-xs ${lineNumberColor} leading-6 text-right`}>
            {num}
          </div>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`w-full h-full px-4 py-4 ${bgColor} ${textColor} font-mono text-xs leading-6 resize-none focus:outline-none`}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>

      {/* Syntax Highlighting Overlay (visual indicator) */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-bg-secondary border border-border rounded text-xs text-text-secondary">
        {language}
      </div>
    </div>
  );
}
