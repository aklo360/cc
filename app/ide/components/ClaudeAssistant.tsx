"use client";

import { useState } from "react";

interface ClaudeAssistantProps {
  currentCode: string;
  currentFile: string;
  onCodeSuggestion: (code: string) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Simulated Claude responses for common coding questions
const getClaudeResponse = (question: string, code: string, fileName: string): string => {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes('explain') || lowerQuestion.includes('what does')) {
    return `I'll help you understand this code! Looking at your ${fileName}:\n\nThis code demonstrates basic functionality. The structure follows common patterns for ${fileName.endsWith('.js') ? 'JavaScript' : fileName.endsWith('.html') ? 'HTML' : 'CSS'}.\n\nKey points:\n• Variables and functions are clearly named\n• The logic follows a straightforward flow\n• Consider adding error handling for edge cases\n\nWould you like me to suggest improvements?`;
  }

  if (lowerQuestion.includes('improve') || lowerQuestion.includes('better') || lowerQuestion.includes('optimize')) {
    return `Here are some suggestions to improve your ${fileName}:\n\n1. Add error handling for robustness\n2. Consider adding JSDoc comments for better documentation\n3. Break down complex functions into smaller, reusable pieces\n4. Add input validation where appropriate\n5. Consider using modern ES6+ features like arrow functions and destructuring\n\nWould you like me to show you a refactored version?`;
  }

  if (lowerQuestion.includes('bug') || lowerQuestion.includes('error') || lowerQuestion.includes('fix')) {
    return `Let me help you debug! Common issues to check:\n\n✓ Syntax errors (missing brackets, semicolons)\n✓ Variable scope issues\n✓ Type mismatches\n✓ Undefined variables or functions\n✓ Logic errors in conditionals\n\nLooking at your code, make sure all variables are properly defined before use. Try adding console.log statements to trace execution flow.`;
  }

  if (lowerQuestion.includes('test') || lowerQuestion.includes('unit test')) {
    return `Great question! Here's how to test your ${fileName}:\n\n\`\`\`javascript\n// Example test structure\nfunction testGreet() {\n  const result = greet("Test");\n  console.assert(result === "Hello, Test!", "Greet function works");\n}\n\ntestGreet();\n\`\`\`\n\nConsider using a testing framework like Jest or Mocha for more robust testing!`;
  }

  if (lowerQuestion.includes('refactor')) {
    return `I'd be happy to help refactor your code! Here are some refactoring principles:\n\n• DRY (Don't Repeat Yourself)\n• Single Responsibility Principle\n• Clear naming conventions\n• Extract magic numbers into constants\n• Simplify complex conditionals\n\nShare which part you'd like to refactor and I'll provide specific suggestions!`;
  }

  if (lowerQuestion.includes('add') || lowerQuestion.includes('create')) {
    return `I can help you add new features! For ${fileName}, consider:\n\n• Breaking down the feature into smaller steps\n• Writing the function signature first\n• Adding proper error handling\n• Testing incrementally\n• Documenting with comments\n\nWhat specific feature would you like to add?`;
  }

  if (lowerQuestion.includes('style') || lowerQuestion.includes('css')) {
    return `CSS styling tips:\n\n• Use CSS variables for consistent theming\n• Follow BEM or similar naming conventions\n• Consider mobile-first responsive design\n• Use flexbox/grid for layouts\n• Optimize for performance (avoid expensive selectors)\n\nWant me to suggest some specific styles for your project?`;
  }

  if (lowerQuestion.includes('hello') || lowerQuestion.includes('hi')) {
    return `Hello! I'm Claude, your AI coding assistant. I can help you:\n\n• Explain code and concepts\n• Debug errors and issues\n• Suggest improvements and optimizations\n• Write tests\n• Refactor code\n• Add new features\n• Style with CSS\n\nJust ask me anything about your code!`;
  }

  return `I'm here to help with your ${fileName}! I can:\n\n• Explain how your code works\n• Suggest improvements and best practices\n• Help debug issues\n• Write tests\n• Refactor for better readability\n• Add new features\n\nWhat would you like me to help you with?`;
};

const QUICK_QUESTIONS = [
  "Explain this code",
  "How can I improve this?",
  "Help me debug this",
  "Suggest optimizations",
  "Add error handling",
  "Write tests for this",
];

export default function ClaudeAssistant({
  currentCode,
  currentFile,
  onCodeSuggestion,
}: ClaudeAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Hi! I'm Claude, your AI coding assistant. I'm here to help you with your code. Ask me anything!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const sendMessage = (message?: string) => {
    const userMessage = message || input.trim();
    if (!userMessage) return;

    // Add user message
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setInput("");
    setIsThinking(true);

    // Simulate thinking delay
    setTimeout(() => {
      const response = getClaudeResponse(userMessage, currentCode, currentFile);
      setMessages([...newMessages, { role: "assistant", content: response }]);
      setIsThinking(false);
    }, 500 + Math.random() * 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="w-80 bg-bg-secondary border-l border-border flex flex-col shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-claude-orange rounded-full flex items-center justify-center text-white font-bold text-xs">
            C
          </div>
          <div>
            <div className="text-text-primary text-sm font-semibold">Claude</div>
            <div className="text-text-muted text-xs">AI Coding Assistant</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                message.role === 'user'
                  ? 'bg-claude-orange text-white'
                  : 'bg-bg-tertiary text-text-primary border border-border'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-bg-tertiary border border-border rounded-lg px-3 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-claude-orange rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-claude-orange rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-claude-orange rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Questions */}
      <div className="px-4 py-2 border-t border-border bg-bg-primary">
        <div className="text-text-muted text-xs mb-2">Quick questions:</div>
        <div className="flex flex-wrap gap-1">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={isThinking}
              className="text-xs px-2 py-1 bg-bg-secondary border border-border rounded text-text-secondary hover:text-claude-orange hover:border-claude-orange transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-bg-primary">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Claude anything..."
            rows={2}
            disabled={isThinking}
            className="flex-1 bg-bg-secondary border border-border rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={isThinking || !input.trim()}
            className="px-3 bg-claude-orange text-white rounded hover:bg-claude-orange-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
