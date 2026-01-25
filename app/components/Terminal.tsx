"use client";

import { useEffect, useState, useRef } from "react";
import ContractAddress from "./ContractAddress";

interface TerminalLine {
  type: "prompt" | "command" | "output" | "typing";
  text: string;
}

const terminalContent: TerminalLine[] = [
  { type: "prompt", text: ">" },
  { type: "command", text: " what is $CC?" },
  {
    type: "output",
    text: `<span class="text-accent-green font-semibold">$CC (Claude Code)</span> is a community memecoin celebrating
the revolutionary Claude Code CLI tool.

<span class="text-accent-blue">Key Facts:</span>
  • Community created & owned
  • 100% of fees go to <span class="text-accent-green">@bcherny</span>
  • Fair launched on Bags.fm`,
  },
  { type: "prompt", text: ">" },
  { type: "command", text: " why $CC?" },
  {
    type: "output",
    text: `Because Claude Code changed how we build software forever.

<span class="text-accent-blue">Before Claude Code:</span> "It'll take 2 sprints"
<span class="text-accent-green">After Claude Code:</span>  "It's already deployed"

This coin is our way of saying thanks to <span class="text-accent-green">Boris</span> and the
team who made AI-assisted coding actually good.`,
  },
  { type: "prompt", text: ">" },
  { type: "typing", text: " " },
];

export default function Terminal() {
  const [displayedContent, setDisplayedContent] = useState<
    { type: string; text: string; isTyping?: boolean }[]
  >([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentLineIndex >= terminalContent.length) {
      setShowCursor(true);
      return;
    }

    const currentItem = terminalContent[currentLineIndex];

    if (currentItem.type === "prompt") {
      setDisplayedContent((prev) => [
        ...prev,
        { type: "prompt", text: currentItem.text },
      ]);
      setCurrentLineIndex((prev) => prev + 1);
      return;
    }

    if (currentItem.type === "command") {
      if (currentCharIndex === 0) {
        setDisplayedContent((prev) => [
          ...prev,
          { type: "command", text: "", isTyping: true },
        ]);
      }

      if (currentCharIndex < currentItem.text.length) {
        const timer = setTimeout(() => {
          setDisplayedContent((prev) => {
            const newContent = [...prev];
            const lastIndex = newContent.length - 1;
            newContent[lastIndex] = {
              ...newContent[lastIndex],
              text: currentItem.text.slice(0, currentCharIndex + 1),
            };
            return newContent;
          });
          setCurrentCharIndex((prev) => prev + 1);
        }, 15);
        return () => clearTimeout(timer);
      } else {
        setDisplayedContent((prev) => {
          const newContent = [...prev];
          const lastIndex = newContent.length - 1;
          newContent[lastIndex] = { ...newContent[lastIndex], isTyping: false };
          return newContent;
        });
        setCurrentCharIndex(0);
        setCurrentLineIndex((prev) => prev + 1);
      }
      return;
    }

    if (currentItem.type === "output") {
      const timer = setTimeout(() => {
        setDisplayedContent((prev) => [
          ...prev,
          { type: "output", text: currentItem.text },
        ]);
        setCurrentLineIndex((prev) => prev + 1);
      }, 50);
      return () => clearTimeout(timer);
    }

    if (currentItem.type === "typing") {
      setShowCursor(true);
    }
  }, [currentLineIndex, currentCharIndex]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [displayedContent]);

  return (
    <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
      {/* Terminal bar */}
      <div className="bg-bg-tertiary px-3 py-2 flex items-center gap-2 border-b border-border">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-text-muted text-xs ml-auto">claude ~ $CC</span>
      </div>

      {/* Contract Address */}
      <div className="px-4 py-3 border-b border-border">
        <ContractAddress />
      </div>

      {/* Terminal body */}
      <div
        ref={terminalRef}
        className="p-4 sm:p-5 min-h-[280px] sm:min-h-[350px] max-h-[350px] sm:max-h-[450px] overflow-y-auto text-sm leading-relaxed relative scanlines"
      >
        {displayedContent.map((item, index) => {
          if (item.type === "prompt") {
            return (
              <span key={index} className="text-claude-orange font-semibold">
                {item.text}
              </span>
            );
          }
          if (item.type === "command") {
            return (
              <span key={index}>
                <span className="text-text-primary">{item.text}</span>
                {item.isTyping && (
                  <span className="inline-block w-2 h-4 bg-claude-orange cursor-blink align-middle ml-0.5" />
                )}
                {!item.isTyping && <br />}
              </span>
            );
          }
          if (item.type === "output") {
            return (
              <div
                key={index}
                className="text-text-secondary my-3 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: item.text }}
              />
            );
          }
          return null;
        })}
        {showCursor && (
          <span className="inline-block w-2 h-4 bg-claude-orange cursor-blink align-middle" />
        )}
      </div>
    </div>
  );
}
