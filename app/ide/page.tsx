"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CodeEditor from "./components/CodeEditor";
import ClaudeAssistant from "./components/ClaudeAssistant";
import FileExplorer from "./components/FileExplorer";

// Example starter files
const STARTER_FILES = {
  "hello.js": `// Welcome to Claude Code IDE!
// Try asking Claude for help with your code

function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("Developer"));`,
  "styles.css": `/* Your styles here */
body {
  font-family: 'Monaco', monospace;
  background: #0d0d0d;
  color: #e0e0e0;
  margin: 0;
  padding: 20px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}`,
  "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>Welcome to Claude Code IDE</h1>
    <p>Start coding with Claude's help!</p>
  </div>
  <script src="hello.js"></script>
</body>
</html>`,
};

export default function IDEPage() {
  const [files, setFiles] = useState<Record<string, string>>(STARTER_FILES);
  const [activeFile, setActiveFile] = useState("hello.js");
  const [code, setCode] = useState(STARTER_FILES["hello.js"]);
  const [output, setOutput] = useState("");
  const [showAssistant, setShowAssistant] = useState(true);
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setCode(files[activeFile] || "");
  }, [activeFile, files]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setFiles({ ...files, [activeFile]: newCode });
  };

  const runCode = () => {
    setOutput("");
    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;

    // Capture console output
    console.log = (...args) => {
      logs.push(args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };
    console.error = (...args) => {
      logs.push('ERROR: ' + args.join(' '));
    };

    try {
      // Only run JavaScript files
      if (activeFile.endsWith('.js')) {
        // eslint-disable-next-line no-eval
        eval(code);
        setOutput(logs.length > 0 ? logs.join('\n') : '✓ Code executed successfully (no output)');
      } else if (activeFile.endsWith('.html')) {
        setOutput('✓ HTML file ready to preview (open in browser)');
      } else if (activeFile.endsWith('.css')) {
        setOutput('✓ CSS file ready to use');
      } else {
        setOutput('✓ File saved');
      }
    } catch (error) {
      setOutput(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  };

  const createNewFile = () => {
    const fileName = prompt("Enter file name (e.g., script.js, style.css):");
    if (fileName && !files[fileName]) {
      const newFiles = { ...files, [fileName]: "// Start coding..." };
      setFiles(newFiles);
      setActiveFile(fileName);
    }
  };

  const deleteFile = (fileName: string) => {
    if (Object.keys(files).length <= 1) {
      alert("Cannot delete the last file!");
      return;
    }
    if (confirm(`Delete ${fileName}?`)) {
      const newFiles = { ...files };
      delete newFiles[fileName];
      setFiles(newFiles);
      if (activeFile === fileName) {
        setActiveFile(Object.keys(newFiles)[0]);
      }
    }
  };

  const downloadFile = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadProject = () => {
    // Create a simple text representation of all files
    let projectContent = "=== CLAUDE CODE IDE PROJECT ===\n\n";
    Object.entries(files).forEach(([fileName, content]) => {
      projectContent += `\n=== FILE: ${fileName} ===\n${content}\n`;
    });

    const blob = new Blob([projectContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-[5%]">
      <div className="h-[90vh] w-[90%] max-w-[1400px] flex flex-col overflow-hidden border border-border rounded-lg bg-[#0d0d0d]">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </Link>
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <img src="/cc.png" alt="$CC" width={24} height={24} />
        </Link>
        <span className="text-claude-orange font-semibold text-sm">Claude Code IDE</span>

        {/* Toolbar */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowFileExplorer(!showFileExplorer)}
            className="px-3 py-1.5 text-xs bg-bg-secondary border border-border rounded text-text-secondary hover:text-claude-orange hover:border-claude-orange transition-colors"
            title="Toggle file explorer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            onClick={() => setShowAssistant(!showAssistant)}
            className="px-3 py-1.5 text-xs bg-bg-secondary border border-border rounded text-text-secondary hover:text-claude-orange hover:border-claude-orange transition-colors"
            title="Toggle Claude assistant"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            onClick={downloadProject}
            className="px-3 py-1.5 text-xs bg-bg-secondary border border-border rounded text-text-secondary hover:text-claude-orange hover:border-claude-orange transition-colors"
            title="Download project"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <span className="text-text-muted text-xs px-2">
            {activeFile}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer */}
        {showFileExplorer && (
          <FileExplorer
            files={files}
            activeFile={activeFile}
            onFileSelect={setActiveFile}
            onFileDelete={deleteFile}
            onNewFile={createNewFile}
          />
        )}

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              code={code}
              onChange={handleCodeChange}
              language={activeFile.split('.').pop() || 'javascript'}
              theme={theme}
            />
          </div>

          {/* Control Bar */}
          <div className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border-t border-border shrink-0">
            <button
              onClick={runCode}
              className="flex items-center gap-2 px-4 py-2 bg-claude-orange text-white rounded text-sm font-semibold hover:bg-claude-orange-dim transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Run
            </button>
            <button
              onClick={downloadFile}
              className="px-3 py-2 bg-bg-tertiary border border-border rounded text-text-secondary text-sm hover:text-claude-orange hover:border-claude-orange transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="px-3 py-2 bg-bg-tertiary border border-border rounded text-text-secondary text-sm hover:text-claude-orange hover:border-claude-orange transition-colors"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
            <div className="flex-1" />
            <span className="text-text-muted text-xs">
              {code.split('\n').length} lines • {code.length} chars
            </span>
          </div>

          {/* Output Panel */}
          <div className="h-32 bg-bg-primary border-t border-border overflow-auto shrink-0">
            <div className="px-4 py-2 border-b border-border bg-bg-secondary">
              <span className="text-text-secondary text-xs uppercase tracking-wider">Output</span>
            </div>
            <pre className="px-4 py-2 text-xs text-text-primary font-mono whitespace-pre-wrap">
              {output || "// Output will appear here when you run your code"}
            </pre>
          </div>
        </div>

        {/* Claude Assistant */}
        {showAssistant && (
          <ClaudeAssistant
            currentCode={code}
            currentFile={activeFile}
            onCodeSuggestion={(suggestion) => handleCodeChange(suggestion)}
          />
        )}
      </div>

        {/* Footer */}
        <footer className="px-4 py-2 border-t border-border text-center shrink-0 bg-bg-secondary rounded-b-lg">
          <Link href="/" className="text-claude-orange hover:underline text-sm">
            ← back
          </Link>
          <p className="text-text-muted text-xs mt-1">
            claudecode.wtf · Built with ❤️ for the Claude Code community
          </p>
        </footer>
      </div>
    </div>
  );
}
