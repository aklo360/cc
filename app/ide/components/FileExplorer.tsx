"use client";

interface FileExplorerProps {
  files: Record<string, string>;
  activeFile: string;
  onFileSelect: (fileName: string) => void;
  onFileDelete: (fileName: string) => void;
  onNewFile: () => void;
}

export default function FileExplorer({
  files,
  activeFile,
  onFileSelect,
  onFileDelete,
  onNewFile,
}: FileExplorerProps) {
  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.js')) return '📜';
    if (fileName.endsWith('.html')) return '🌐';
    if (fileName.endsWith('.css')) return '🎨';
    if (fileName.endsWith('.json')) return '📋';
    if (fileName.endsWith('.md')) return '📝';
    return '📄';
  };

  return (
    <div className="w-64 bg-bg-secondary border-r border-border flex flex-col shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-text-secondary text-xs uppercase tracking-wider">Files</span>
        <button
          onClick={onNewFile}
          className="p-1 text-text-secondary hover:text-claude-orange transition-colors"
          title="New file"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-auto">
        {Object.keys(files).map((fileName) => (
          <div
            key={fileName}
            className={`group flex items-center justify-between px-4 py-2 cursor-pointer transition-colors ${
              activeFile === fileName
                ? 'bg-bg-tertiary text-claude-orange border-l-2 border-claude-orange'
                : 'text-text-primary hover:bg-bg-tertiary'
            }`}
            onClick={() => onFileSelect(fileName)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm shrink-0">{getFileIcon(fileName)}</span>
              <span className="text-xs truncate">{fileName}</span>
            </div>
            {Object.keys(files).length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFileDelete(fileName);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-red-400 transition-all"
                title="Delete file"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="px-4 py-2 border-t border-border bg-bg-primary">
        <div className="text-text-muted text-xs">
          {Object.keys(files).length} file{Object.keys(files).length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
