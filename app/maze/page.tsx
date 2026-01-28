'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

type Algorithm = 'dfs' | 'bfs' | 'astar';
type Cell = {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
  distance: number;
  isPath: boolean;
  isCurrent: boolean;
};

export default function MazePage() {
  const [gridSize, setGridSize] = useState(15);
  const [algorithm, setAlgorithm] = useState<Algorithm>('dfs');
  const [maze, setMaze] = useState<Cell[][]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [speed, setSpeed] = useState(20);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const cellSize = 20;

  // Initialize maze with all walls
  const initializeMaze = (size: number): Cell[][] => {
    const newMaze: Cell[][] = [];
    for (let y = 0; y < size; y++) {
      newMaze[y] = [];
      for (let x = 0; x < size; x++) {
        newMaze[y][x] = {
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
          distance: Infinity,
          isPath: false,
          isCurrent: false,
        };
      }
    }
    return newMaze;
  };

  // Draw the maze on canvas
  const drawMaze = (mazeData: Cell[][]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    mazeData.forEach((row, y) => {
      row.forEach((cell, x) => {
        const px = x * cellSize;
        const py = y * cellSize;

        // Draw cell background
        if (cell.isCurrent) {
          ctx.fillStyle = '#ff6b35';
        } else if (cell.isPath) {
          ctx.fillStyle = '#28c840';
        } else if (cell.visited) {
          ctx.fillStyle = '#1a1a1a';
        } else {
          ctx.fillStyle = '#0a0a0a';
        }
        ctx.fillRect(px, py, cellSize, cellSize);

        // Draw walls
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 2;
        ctx.beginPath();

        if (cell.walls.top) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + cellSize, py);
        }
        if (cell.walls.right) {
          ctx.moveTo(px + cellSize, py);
          ctx.lineTo(px + cellSize, py + cellSize);
        }
        if (cell.walls.bottom) {
          ctx.moveTo(px, py + cellSize);
          ctx.lineTo(px + cellSize, py + cellSize);
        }
        if (cell.walls.left) {
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cellSize);
        }

        ctx.stroke();
      });
    });

    // Draw start (top-left)
    ctx.fillStyle = '#febc2e';
    ctx.fillRect(2, 2, cellSize - 4, cellSize - 4);

    // Draw end (bottom-right)
    const endX = (mazeData[0].length - 1) * cellSize;
    const endY = (mazeData.length - 1) * cellSize;
    ctx.fillStyle = '#ff5f57';
    ctx.fillRect(endX + 2, endY + 2, cellSize - 4, cellSize - 4);
  };

  // Generate maze using DFS
  const generateMazeDFS = async (mazeData: Cell[][]) => {
    const stack: Cell[] = [];
    const startCell = mazeData[0][0];
    startCell.visited = true;
    stack.push(startCell);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      current.isCurrent = true;

      // Get unvisited neighbors
      const neighbors: Array<{ cell: Cell; direction: string }> = [];
      const { x, y } = current;

      if (y > 0 && !mazeData[y - 1][x].visited)
        neighbors.push({ cell: mazeData[y - 1][x], direction: 'top' });
      if (x < mazeData[0].length - 1 && !mazeData[y][x + 1].visited)
        neighbors.push({ cell: mazeData[y][x + 1], direction: 'right' });
      if (y < mazeData.length - 1 && !mazeData[y + 1][x].visited)
        neighbors.push({ cell: mazeData[y + 1][x], direction: 'bottom' });
      if (x > 0 && !mazeData[y][x - 1].visited)
        neighbors.push({ cell: mazeData[y][x - 1], direction: 'left' });

      if (neighbors.length > 0) {
        const { cell: next, direction } = neighbors[Math.floor(Math.random() * neighbors.length)];

        // Remove walls
        if (direction === 'top') {
          current.walls.top = false;
          next.walls.bottom = false;
        } else if (direction === 'right') {
          current.walls.right = false;
          next.walls.left = false;
        } else if (direction === 'bottom') {
          current.walls.bottom = false;
          next.walls.top = false;
        } else if (direction === 'left') {
          current.walls.left = false;
          next.walls.right = false;
        }

        next.visited = true;
        stack.push(next);
      } else {
        current.isCurrent = false;
        stack.pop();
      }

      drawMaze(mazeData);
      await new Promise(resolve => setTimeout(resolve, 100 - speed));
    }

    // Clear current markers
    mazeData.forEach(row => row.forEach(cell => { cell.isCurrent = false; }));
    drawMaze(mazeData);
  };

  // Solve maze using BFS
  const solveMazeBFS = async (mazeData: Cell[][]) => {
    // Reset visited for solving
    mazeData.forEach(row => row.forEach(cell => {
      cell.visited = false;
      cell.isPath = false;
      cell.isCurrent = false;
      cell.distance = Infinity;
    }));

    const queue: Array<{ cell: Cell; path: Cell[] }> = [];
    const start = mazeData[0][0];
    start.visited = true;
    start.distance = 0;
    queue.push({ cell: start, path: [start] });

    while (queue.length > 0) {
      const { cell: current, path } = queue.shift()!;
      current.isCurrent = true;

      // Check if we reached the end
      if (current.x === mazeData[0].length - 1 && current.y === mazeData.length - 1) {
        // Mark the solution path
        path.forEach(cell => { cell.isPath = true; cell.isCurrent = false; });
        drawMaze(mazeData);
        return;
      }

      // Check all neighbors
      const { x, y } = current;
      const neighbors: Cell[] = [];

      if (!current.walls.top && y > 0) neighbors.push(mazeData[y - 1][x]);
      if (!current.walls.right && x < mazeData[0].length - 1) neighbors.push(mazeData[y][x + 1]);
      if (!current.walls.bottom && y < mazeData.length - 1) neighbors.push(mazeData[y + 1][x]);
      if (!current.walls.left && x > 0) neighbors.push(mazeData[y][x - 1]);

      for (const neighbor of neighbors) {
        if (!neighbor.visited) {
          neighbor.visited = true;
          neighbor.distance = current.distance + 1;
          queue.push({ cell: neighbor, path: [...path, neighbor] });
        }
      }

      current.isCurrent = false;
      drawMaze(mazeData);
      await new Promise(resolve => setTimeout(resolve, 100 - speed));
    }
  };

  // Solve maze using A*
  const solveMazeAStar = async (mazeData: Cell[][]) => {
    // Reset for solving
    mazeData.forEach(row => row.forEach(cell => {
      cell.visited = false;
      cell.isPath = false;
      cell.isCurrent = false;
      cell.distance = Infinity;
    }));

    const start = mazeData[0][0];
    const end = mazeData[mazeData.length - 1][mazeData[0].length - 1];

    const heuristic = (cell: Cell) => {
      return Math.abs(cell.x - end.x) + Math.abs(cell.y - end.y);
    };

    const openSet: Array<{ cell: Cell; path: Cell[]; fScore: number }> = [];
    start.visited = true;
    start.distance = 0;
    openSet.push({ cell: start, path: [start], fScore: heuristic(start) });

    while (openSet.length > 0) {
      // Sort by fScore
      openSet.sort((a, b) => a.fScore - b.fScore);
      const { cell: current, path } = openSet.shift()!;
      current.isCurrent = true;

      if (current.x === end.x && current.y === end.y) {
        path.forEach(cell => { cell.isPath = true; cell.isCurrent = false; });
        drawMaze(mazeData);
        return;
      }

      const { x, y } = current;
      const neighbors: Cell[] = [];

      if (!current.walls.top && y > 0) neighbors.push(mazeData[y - 1][x]);
      if (!current.walls.right && x < mazeData[0].length - 1) neighbors.push(mazeData[y][x + 1]);
      if (!current.walls.bottom && y < mazeData.length - 1) neighbors.push(mazeData[y + 1][x]);
      if (!current.walls.left && x > 0) neighbors.push(mazeData[y][x - 1]);

      for (const neighbor of neighbors) {
        if (!neighbor.visited) {
          neighbor.visited = true;
          const tentativeG = current.distance + 1;
          neighbor.distance = tentativeG;
          const fScore = tentativeG + heuristic(neighbor);
          openSet.push({ cell: neighbor, path: [...path, neighbor], fScore });
        }
      }

      current.isCurrent = false;
      drawMaze(mazeData);
      await new Promise(resolve => setTimeout(resolve, 100 - speed));
    }
  };

  // Handle generate maze
  const handleGenerate = async () => {
    setIsGenerating(true);
    setIsSolving(false);
    const newMaze = initializeMaze(gridSize);
    setMaze(newMaze);
    await generateMazeDFS(newMaze);
    setIsGenerating(false);
  };

  // Handle solve maze
  const handleSolve = async () => {
    if (maze.length === 0) return;
    setIsSolving(true);

    if (algorithm === 'bfs') {
      await solveMazeBFS(maze);
    } else if (algorithm === 'astar') {
      await solveMazeAStar(maze);
    } else {
      // DFS solving
      await solveMazeBFS(maze); // Use BFS as default solver
    }

    setIsSolving(false);
  };

  // Initialize with a maze on mount
  useEffect(() => {
    const initialMaze = initializeMaze(gridSize);
    setMaze(initialMaze);
    drawMaze(initialMaze);
    // Auto-generate on load
    setTimeout(() => handleGenerate(), 100);
  }, []);

  // Draw whenever maze changes
  useEffect(() => {
    if (maze.length > 0) {
      drawMaze(maze);
    }
  }, [maze]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-4 sm:py-8 px-[5%]">
      <div className="max-w-[900px] w-[90%]">

        {/* HEADER */}
        <header className="flex items-center gap-3 py-3 mb-6">
          <Link href="/" className="flex gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/cc.png" alt="$CC" width={24} height={24} />
          </Link>
          <span className="text-claude-orange font-semibold text-sm">Code Maze Generator</span>
          <span className="text-text-muted text-xs ml-auto">DFS, BFS, A* Algorithms</span>
        </header>

        {/* CONTENT */}
        <div className="space-y-4">

          {/* Canvas Display */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
              Maze Visualization
            </label>
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={gridSize * cellSize}
                height={gridSize * cellSize}
                className="border border-border rounded"
              />
            </div>
            <div className="flex gap-4 mt-3 text-xs justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#febc2e]" />
                <span className="text-text-muted">Start</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#ff5f57]" />
                <span className="text-text-muted">End</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#28c840]" />
                <span className="text-text-muted">Solution Path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#ff6b35]" />
                <span className="text-text-muted">Current</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
              Maze Settings
            </label>

            <div className="space-y-3">
              <div>
                <label className="text-text-primary text-sm mb-1 block">
                  Grid Size: {gridSize}x{gridSize}
                </label>
                <input
                  type="range"
                  min="5"
                  max="25"
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  disabled={isGenerating || isSolving}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-text-primary text-sm mb-1 block">
                  Animation Speed
                </label>
                <input
                  type="range"
                  min="1"
                  max="90"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-text-primary text-sm mb-2 block">
                  Solving Algorithm
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAlgorithm('dfs')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
                      algorithm === 'dfs'
                        ? 'bg-claude-orange text-white'
                        : 'bg-bg-tertiary border border-border text-text-primary hover:border-claude-orange'
                    }`}
                  >
                    DFS
                  </button>
                  <button
                    onClick={() => setAlgorithm('bfs')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
                      algorithm === 'bfs'
                        ? 'bg-claude-orange text-white'
                        : 'bg-bg-tertiary border border-border text-text-primary hover:border-claude-orange'
                    }`}
                  >
                    BFS
                  </button>
                  <button
                    onClick={() => setAlgorithm('astar')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
                      algorithm === 'astar'
                        ? 'bg-claude-orange text-white'
                        : 'bg-bg-tertiary border border-border text-text-primary hover:border-claude-orange'
                    }`}
                  >
                    A*
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || isSolving}
              className="flex-1 bg-claude-orange text-white font-semibold py-2.5 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate New Maze'}
            </button>
            <button
              onClick={handleSolve}
              disabled={isGenerating || isSolving || maze.length === 0}
              className="flex-1 bg-bg-tertiary border border-border text-text-primary px-4 py-2.5 rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSolving ? 'Solving...' : `Solve with ${algorithm.toUpperCase()}`}
            </button>
          </div>

          {/* Info */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
              About the Algorithms
            </label>
            <div className="text-text-primary text-sm space-y-2">
              <p>
                <span className="text-claude-orange font-semibold">DFS (Depth-First Search):</span> Explores as far as possible along each branch before backtracking. Good for maze generation.
              </p>
              <p>
                <span className="text-claude-orange font-semibold">BFS (Breadth-First Search):</span> Explores all neighbors at the current depth before moving deeper. Guarantees shortest path.
              </p>
              <p>
                <span className="text-claude-orange font-semibold">A* (A-Star):</span> Uses heuristics to find the optimal path more efficiently. Best for pathfinding.
              </p>
            </div>
          </div>

        </div>

        {/* FOOTER */}
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
