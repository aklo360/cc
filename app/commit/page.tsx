'use client';

import { useState } from 'react';
import Link from 'next/link';

const EXAMPLE_DIFF = `diff --git a/src/auth.ts b/src/auth.ts
index 1234567..abcdefg 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,7 +10,7 @@ export async function login(username: string, password: string) {
   }

   // Check password
-  if (password === user.password) {
+  if (await bcrypt.compare(password, user.hashedPassword)) {
     return { success: true, token: generateToken(user) };
   }

@@ -25,6 +25,7 @@ export async function register(username: string, password: string) {
     throw new Error('Username already exists');
   }

+  const hashedPassword = await bcrypt.hash(password, 10);
   const newUser = {
     id: generateId(),
     username,
-    password,
+    password: hashedPassword,
     createdAt: new Date(),
   };`;

const EXAMPLE_DIFFS = [
  EXAMPLE_DIFF,
  `diff --git a/src/utils.js b/src/utils.js
index abc123..def456 100644
--- a/src/utils.js
+++ b/src/utils.js
@@ -1,8 +1,3 @@
-function getData() {
-  var x = 1;
-  console.log('TODO: implement this');
-  return null;
-}
+// Removed unused function

 export function formatDate(date) {
-  return date.toString();
+  return new Intl.DateTimeFormat('en-US').format(date);
 }`,
  `diff --git a/README.md b/README.md
index 111222..333444 100644
--- a/README.md
+++ b/README.md
@@ -1,6 +1,6 @@
 # My Awesome Project

-A project that does cool stuff.
+A project that does cool stuff. Now with 100% more features!

 ## Installation

-npm install
+\`\`\`bash
+npm install
+\`\`\``,
];

interface CommitMessage {
  style: string;
  message: string;
  emoji: string;
}

const COMMIT_STYLES = [
  { id: 'conventional', name: 'Conventional', emoji: '📋', color: 'accent-blue' },
  { id: 'honest', name: 'Brutally Honest', emoji: '🔥', color: 'claude-orange' },
  { id: 'sarcastic', name: 'Sarcastic', emoji: '😏', color: 'accent-purple' },
  { id: 'poetic', name: 'Poetic', emoji: '✨', color: 'accent-yellow' },
];

export default function CommitPage() {
  const [diff, setDiff] = useState(EXAMPLE_DIFF);
  const [messages, setMessages] = useState<CommitMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateMessages = async () => {
    if (!diff.trim() || isGenerating) return;

    setIsGenerating(true);
    setMessages([]);
    setCopiedIndex(null);

    // Simulate API delay for realism
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate different style messages based on the diff content
    const hasPassword = diff.toLowerCase().includes('password');
    const hasRemoval = diff.includes('- ');
    const hasAddition = diff.includes('+ ');
    const hasReadme = diff.includes('README');

    const generatedMessages: CommitMessage[] = [
      {
        style: 'conventional',
        emoji: '🔒',
        message: hasPassword
          ? 'feat(auth): implement password hashing with bcrypt\n\nReplace plaintext password storage with bcrypt hashing.\nAdd password comparison using bcrypt.compare().\n\nBREAKING CHANGE: Existing passwords need to be re-hashed'
          : hasReadme
          ? 'docs: update README with installation instructions\n\nAdd code block formatting for better readability'
          : 'refactor: improve code quality and remove dead code\n\nRemove unused functions and update implementations',
      },
      {
        style: 'honest',
        emoji: '😅',
        message: hasPassword
          ? 'fix: stop storing passwords in plain text (oops)\n\nYeah... we were storing passwords in plain text. For how long? Don\'t ask.\nNow using bcrypt like we should have from day one. My bad.'
          : hasRemoval
          ? 'chore: delete code I should have removed months ago\n\nThat function has been sitting there, unused, judging me. Not anymore.'
          : 'fix: actually make the thing work this time\n\nTurns out reading the docs helps. Who knew?',
      },
      {
        style: 'sarcastic',
        emoji: '🙄',
        message: hasPassword
          ? 'security: add "encryption" (you know, that thing we forgot)\n\nApparently storing passwords as-is isn\'t "best practice" or "legal" or "secure".\nSo here we are, adding bcrypt. Better late than never, right?'
          : hasRemoval
          ? 'cleanup: remove the code that "might be useful later"\n\nSpoiler: it wasn\'t useful. It was never going to be useful.\nDeleted 50 lines of "just in case" code. You\'re welcome, future me.'
          : 'refactor: make code "readable" (apparently that matters)\n\nChanged some stuff. Fixed some things. It works now. Maybe.',
      },
      {
        style: 'poetic',
        emoji: '🌟',
        message: hasPassword
          ? 'feat: weave a cryptographic tapestry of security ✨\n\nLike ancient guardians protecting sacred texts,\nbcrypt now shields our users\' secret words,\ntransforming plain truths into salted mysteries.\nA dance of hashes, a symphony of protection.'
          : hasRemoval
          ? 'refactor: prune the garden of forgotten code 🌺\n\nLike autumn leaves that fall to nourish soil,\nold functions fade to make room for new growth.\nIn deletion, we find clarity; in simplicity, strength.'
          : 'docs: polish the mirrors that reflect our craft 📖\n\nWords arranged with care, like stones in a zen garden.\nDocumentation flows like water, clear and purposeful.\nKnowledge shared is wisdom multiplied.',
      },
    ];

    // Filter by selected style if any
    const filtered = selectedStyle
      ? generatedMessages.filter(m => m.style === selectedStyle)
      : generatedMessages;

    setMessages(filtered);
    setIsGenerating(false);
  };

  const handleCopy = async (message: string, index: number) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRandomDiff = () => {
    const randomIndex = Math.floor(Math.random() * EXAMPLE_DIFFS.length);
    setDiff(EXAMPLE_DIFFS[randomIndex]);
    setMessages([]);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-[900px] w-[90%]">

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
          <span className="text-claude-orange font-semibold text-sm">Commit Messages</span>
          <span className="text-text-muted text-xs ml-auto hidden sm:inline">💬 AI-powered commits</span>
        </header>

        {/* Hero Section */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            Claude&apos;s Commit Messages
          </h1>
          <p className="text-text-secondary text-sm sm:text-base">
            Paste your diff, get hilariously accurate commit messages that actually make sense
          </p>
          <p className="text-text-muted text-xs mt-1">
            Choose your style: Professional, Honest, Sarcastic, or Poetic ✨
          </p>
        </div>

        {/* Style Selector */}
        <div className="mb-4">
          <label className="text-text-muted text-xs mb-2 block">
            Choose your vibe (or get all styles):
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedStyle(null)}
              className={`px-3 py-1.5 rounded text-xs transition-all ${
                selectedStyle === null
                  ? 'bg-claude-orange text-white border border-claude-orange'
                  : 'bg-bg-tertiary border border-border text-text-secondary hover:border-claude-orange'
              }`}
            >
              All Styles
            </button>
            {COMMIT_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`px-3 py-1.5 rounded text-xs transition-all ${
                  selectedStyle === style.id
                    ? `bg-${style.color} text-white border border-${style.color}`
                    : 'bg-bg-tertiary border border-border text-text-secondary hover:border-claude-orange'
                }`}
              >
                {style.emoji} {style.name}
              </button>
            ))}
          </div>
        </div>

        {/* Diff Input */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-text-secondary text-xs uppercase tracking-wider">
              📋 Paste Your Git Diff
            </label>
            <button
              onClick={handleRandomDiff}
              className="text-xs text-claude-orange hover:text-claude-orange/80 transition-colors"
            >
              🎲 Random Example
            </button>
          </div>
          <textarea
            value={diff}
            onChange={(e) => setDiff(e.target.value)}
            className="w-full h-64 bg-bg-primary border border-border rounded-md px-3 py-3 font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none overflow-auto"
            placeholder="diff --git a/src/file.ts b/src/file.ts
index 1234567..abcdefg 100644
--- a/src/file.ts
+++ b/src/file.ts
@@ -10,3 +10,4 @@
-  old code
+  new code"
          />
          <div className="flex items-center justify-between mt-4">
            <p className="text-text-muted text-xs">
              Tip: Use <code className="bg-bg-tertiary px-1 py-0.5 rounded">git diff --staged</code> to get your diff
            </p>
            <button
              onClick={generateMessages}
              disabled={isGenerating || !diff.trim()}
              className="bg-claude-orange text-white font-semibold py-2.5 px-6 rounded-md text-sm hover:bg-claude-orange-dim transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {isGenerating ? '✨ Generating...' : '✨ Generate Commits'}
            </button>
          </div>
        </div>

        {/* Generated Messages */}
        {messages.length > 0 && (
          <div className="space-y-3 mb-6">
            {messages.map((msg, index) => {
              const styleConfig = COMMIT_STYLES.find(s => s.id === msg.style);
              return (
                <div
                  key={index}
                  className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-claude-orange/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{msg.emoji}</span>
                      <h3 className="text-text-primary font-semibold text-sm capitalize">
                        {styleConfig?.name || msg.style}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleCopy(msg.message, index)}
                      className="text-xs px-3 py-1.5 bg-bg-tertiary border border-border rounded hover:border-claude-orange hover:text-claude-orange transition-colors"
                    >
                      {copiedIndex === index ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                  <pre className="text-text-secondary text-xs font-mono whitespace-pre-wrap leading-relaxed bg-bg-primary border border-border rounded px-3 py-3">
{msg.message}
                  </pre>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="text-2xl mb-2 text-center">📋</div>
            <div className="text-text-primary text-xs font-semibold text-center mb-1">
              Conventional
            </div>
            <div className="text-text-muted text-xs text-center">
              Professional commits that follow standards
            </div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="text-2xl mb-2 text-center">🔥</div>
            <div className="text-text-primary text-xs font-semibold text-center mb-1">
              Brutally Honest
            </div>
            <div className="text-text-muted text-xs text-center">
              What you&apos;re really thinking
            </div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="text-2xl mb-2 text-center">✨</div>
            <div className="text-text-primary text-xs font-semibold text-center mb-1">
              Creative Styles
            </div>
            <div className="text-text-muted text-xs text-center">
              Sarcastic or poetic vibes
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-6">
          <h3 className="text-text-secondary text-xs uppercase tracking-wider mb-3">
            How it works
          </h3>
          <div className="space-y-2 text-xs text-text-muted">
            <div className="flex items-start gap-2">
              <span className="text-claude-orange mt-0.5">1.</span>
              <span>Copy your staged changes with <code className="bg-bg-tertiary px-1 py-0.5 rounded text-text-secondary">git diff --staged</code></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-claude-orange mt-0.5">2.</span>
              <span>Paste the diff into the text area above</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-claude-orange mt-0.5">3.</span>
              <span>Choose your style or get all four variants</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-claude-orange mt-0.5">4.</span>
              <span>Click generate and pick your favorite message</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-claude-orange mt-0.5">5.</span>
              <span>Copy and use with <code className="bg-bg-tertiary px-1 py-0.5 rounded text-text-secondary">git commit -m "your message"</code></span>
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
