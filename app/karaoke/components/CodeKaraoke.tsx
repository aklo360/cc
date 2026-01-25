'use client';

import { useState, useEffect, useRef } from 'react';

// Song definitions with code lyrics
const SONGS = [
  {
    id: 'bohemian',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    tempo: 120, // BPM
    lyrics: [
      { text: 'function isThisTheRealLife() {', duration: 4 },
      { text: '  return isThisJustFantasy();', duration: 4 },
      { text: '}', duration: 2 },
      { text: 'try {', duration: 2 },
      { text: '  escapeFromReality();', duration: 3 },
      { text: '} catch (eyes) {', duration: 3 },
      { text: '  openYourEyes();', duration: 2 },
      { text: '  lookUpToTheSkies();', duration: 2 },
      { text: '  andSee();', duration: 2 },
      { text: '}', duration: 2 },
    ],
  },
  {
    id: 'never-gonna',
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    tempo: 113,
    lyrics: [
      { text: 'never.gonna.giveYouUp();', duration: 3 },
      { text: 'never.gonna.letYouDown();', duration: 3 },
      { text: 'never.gonna.runAround();', duration: 3 },
      { text: 'never.gonna.desertYou();', duration: 3 },
      { text: 'never.gonna.makeYouCry();', duration: 3 },
      { text: 'never.gonna.sayGoodbye();', duration: 3 },
      { text: 'never.gonna.tellALie();', duration: 3 },
      { text: 'never.gonna.hurtYou();', duration: 3 },
    ],
  },
  {
    id: 'let-it-be',
    title: 'Let It Be',
    artist: 'The Beatles',
    tempo: 72,
    lyrics: [
      { text: 'when (isFindMyself() in troubleTimes) {', duration: 4 },
      { text: '  motherMary.comesToMe();', duration: 4 },
      { text: '  speaking.wordsOfWisdom();', duration: 4 },
      { text: '  letItBe();', duration: 3 },
      { text: '}', duration: 2 },
      { text: 'for (const hour of darknessHours) {', duration: 4 },
      { text: '  standingRightInFrontOfMe();', duration: 4 },
      { text: '  speaking.wordsOfWisdom();', duration: 4 },
      { text: '  letItBe();', duration: 3 },
      { text: '}', duration: 2 },
    ],
  },
  {
    id: 'shape-of-you',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    tempo: 96,
    lyrics: [
      { text: 'const girl = findIn(bar);', duration: 3 },
      { text: 'const me = findIn(bar);', duration: 3 },
      { text: 'while (pushing && shoving) {', duration: 3 },
      { text: '  girl.body.startTalking();', duration: 3 },
      { text: '}', duration: 2 },
      { text: 'if (inLove(shapeOfYou)) {', duration: 3 },
      { text: '  push(); pull();', duration: 2 },
      { text: '  fallingInLove(body);', duration: 3 },
      { text: '}', duration: 2 },
    ],
  },
  {
    id: 'hello',
    title: 'Hello',
    artist: 'Adele',
    tempo: 79,
    lyrics: [
      { text: 'hello.from(otherSide);', duration: 4 },
      { text: 'await call(thousandTimes);', duration: 4 },
      { text: 'to.tellYou(sorry);', duration: 3 },
      { text: 'for (const thing of everything) {', duration: 4 },
      { text: '  if (thing.done) {', duration: 3 },
      { text: '    never.mend(you);', duration: 3 },
      { text: '  }', duration: 2 },
      { text: '}', duration: 2 },
    ],
  },
];

type GameState = 'menu' | 'playing' | 'finished';

export default function CodeKaraoke() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [selectedSong, setSelectedSong] = useState(SONGS[0]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentLine = selectedSong.lyrics[currentLineIndex];
  const isLastLine = currentLineIndex === selectedSong.lyrics.length - 1;

  // Calculate time per beat in milliseconds
  const msPerBeat = (60 / selectedSong.tempo) * 1000;

  // Start game
  const startGame = (song: typeof SONGS[0]) => {
    setSelectedSong(song);
    setGameState('playing');
    setCurrentLineIndex(0);
    setUserInput('');
    setScore(0);
    setCombo(0);
    setMistakes(0);
    const initialTime = song.lyrics[0].duration * msPerBeat / 1000;
    setTimeLeft(initialTime);
    setStartTime(Date.now());
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Timer logic
  useEffect(() => {
    if (gameState !== 'playing' || !startTime) return;

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const lineTime = currentLine.duration * msPerBeat / 1000;
      const remaining = Math.max(0, lineTime - elapsed);

      setTimeLeft(remaining);

      if (remaining <= 0) {
        // Time's up for this line
        handleTimeUp();
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, startTime, currentLineIndex]);

  const handleTimeUp = () => {
    // If not completed, count as mistake
    if (userInput.trim() !== currentLine.text) {
      setMistakes(prev => prev + 1);
      setCombo(0);
    }
    moveToNextLine();
  };

  const moveToNextLine = () => {
    if (isLastLine) {
      setGameState('finished');
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setCurrentLineIndex(prev => prev + 1);
      setUserInput('');
      setStartTime(Date.now());
      const nextLineTime = selectedSong.lyrics[currentLineIndex + 1].duration * msPerBeat / 1000;
      setTimeLeft(nextLineTime);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserInput(value);

    // Check if line is completed correctly
    if (value === currentLine.text) {
      // Perfect! Calculate score based on time remaining
      const timingBonus = Math.floor(timeLeft * 10);
      const comboBonus = combo * 5;
      const lineScore = 100 + timingBonus + comboBonus;

      setScore(prev => prev + lineScore);
      setCombo(prev => prev + 1);

      moveToNextLine();
    } else if (value.length > currentLine.text.length) {
      // Typed too much - mistake
      setMistakes(prev => prev + 1);
      setCombo(0);
    } else {
      // Check for mistakes character by character
      const expected = currentLine.text.slice(0, value.length);
      if (value !== expected) {
        setMistakes(prev => prev + 1);
        setCombo(0);
      }
    }
  };

  const calculateAccuracy = () => {
    const totalChars = selectedSong.lyrics.reduce((sum, line) => sum + line.text.length, 0);
    const errorRate = mistakes / totalChars;
    return Math.max(0, Math.min(100, Math.round((1 - errorRate) * 100)));
  };

  const getRank = () => {
    const accuracy = calculateAccuracy();
    if (accuracy >= 98 && combo >= selectedSong.lyrics.length) return 'S';
    if (accuracy >= 95) return 'A';
    if (accuracy >= 85) return 'B';
    if (accuracy >= 70) return 'C';
    return 'D';
  };

  // Menu view
  if (gameState === 'menu') {
    return (
      <div className="space-y-6">
        <div className="bg-bg-secondary border border-border rounded-lg p-6">
          <h2 className="text-text-primary text-lg font-semibold mb-3">
            🎤 How to Play
          </h2>
          <ul className="text-text-secondary text-sm space-y-2 list-disc list-inside">
            <li>Type the code lyrics as they appear on screen</li>
            <li>Stay in rhythm - each line has a time limit!</li>
            <li>Perfect timing earns bonus points</li>
            <li>Build combos for multipliers</li>
            <li>Miss a semicolon? You&apos;re off-key! 🎵</li>
          </ul>
        </div>

        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
            Select Your Song
          </label>
          <div className="space-y-2">
            {SONGS.map((song) => (
              <button
                key={song.id}
                onClick={() => startGame(song)}
                className="w-full bg-bg-tertiary border border-border text-left p-4 rounded-md hover:border-claude-orange hover:bg-bg-primary transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-text-primary font-semibold text-sm group-hover:text-claude-orange transition-colors">
                      {song.title}
                    </div>
                    <div className="text-text-muted text-xs mt-1">
                      {song.artist} • {song.tempo} BPM • {song.lyrics.length} lines
                    </div>
                  </div>
                  <div className="text-claude-orange opacity-0 group-hover:opacity-100 transition-opacity">
                    ▶
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Playing view
  if (gameState === 'playing') {
    const progressPercent = (currentLineIndex / selectedSong.lyrics.length) * 100;
    const timePercent = (timeLeft / (currentLine.duration * msPerBeat / 1000)) * 100;

    return (
      <div className="space-y-4">
        {/* Song info header */}
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-claude-orange font-semibold text-sm">
                {selectedSong.title}
              </div>
              <div className="text-text-muted text-xs mt-1">
                {selectedSong.artist}
              </div>
            </div>
            <div className="text-right">
              <div className="text-text-primary font-semibold text-sm">
                {score.toLocaleString()}
              </div>
              <div className="text-text-muted text-xs mt-1">
                Score
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-bg-primary rounded-full h-2 overflow-hidden">
            <div
              className="bg-claude-orange h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-bg-secondary border border-border rounded-lg p-3 text-center">
            <div className="text-accent-yellow font-semibold text-lg">
              {combo}x
            </div>
            <div className="text-text-muted text-xs mt-1">Combo</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-3 text-center">
            <div className="text-accent-green font-semibold text-lg">
              {currentLineIndex + 1}/{selectedSong.lyrics.length}
            </div>
            <div className="text-text-muted text-xs mt-1">Lines</div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-3 text-center">
            <div className="text-accent-blue font-semibold text-lg">
              {mistakes}
            </div>
            <div className="text-text-muted text-xs mt-1">Mistakes</div>
          </div>
        </div>

        {/* Current line to type */}
        <div className="bg-bg-secondary border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider">
              Type this line:
            </label>
            <div className="flex items-center gap-2">
              <div className="text-text-muted text-xs">
                {timeLeft.toFixed(1)}s
              </div>
              <div className="w-20 bg-bg-primary rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    timePercent > 50 ? 'bg-accent-green' :
                    timePercent > 25 ? 'bg-accent-yellow' :
                    'bg-[#ff5f57]'
                  }`}
                  style={{ width: `${timePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Target text */}
          <div className="bg-bg-primary border border-border rounded-md p-4 mb-4 font-mono text-sm">
            <div className="text-text-primary whitespace-pre">
              {currentLine.text.split('').map((char, i) => {
                const userChar = userInput[i];
                const isCorrect = userChar === char;
                const isTyped = i < userInput.length;

                return (
                  <span
                    key={i}
                    className={
                      isTyped
                        ? isCorrect
                          ? 'text-accent-green'
                          : 'text-[#ff5f57] bg-[#ff5f57]/20'
                        : i === userInput.length
                        ? 'bg-claude-orange/30'
                        : 'text-text-muted'
                    }
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={handleInputChange}
            className="w-full bg-bg-primary border border-border rounded-md px-4 py-3 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors"
            placeholder="Start typing..."
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Preview next line */}
        {!isLastLine && (
          <div className="bg-bg-secondary border border-border rounded-lg p-4 opacity-50">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
              Next:
            </label>
            <div className="text-text-muted font-mono text-xs">
              {selectedSong.lyrics[currentLineIndex + 1].text}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Finished view
  if (gameState === 'finished') {
    const accuracy = calculateAccuracy();
    const rank = getRank();

    return (
      <div className="space-y-6">
        {/* Results */}
        <div className="bg-bg-secondary border border-border rounded-lg p-6 text-center">
          <div className="text-6xl mb-4">
            {rank === 'S' && '🏆'}
            {rank === 'A' && '🎉'}
            {rank === 'B' && '👏'}
            {rank === 'C' && '👍'}
            {rank === 'D' && '😅'}
          </div>
          <div className="text-4xl font-bold text-claude-orange mb-2">
            Rank {rank}
          </div>
          <div className="text-text-muted text-sm">
            {selectedSong.title} • {selectedSong.artist}
          </div>
        </div>

        {/* Stats breakdown */}
        <div className="bg-bg-secondary border border-border rounded-lg p-6">
          <label className="text-text-secondary text-xs uppercase tracking-wider mb-4 block">
            Performance
          </label>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Final Score</span>
              <span className="text-text-primary font-semibold text-lg">
                {score.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Accuracy</span>
              <span className="text-accent-green font-semibold">
                {accuracy}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Max Combo</span>
              <span className="text-accent-yellow font-semibold">
                {combo}x
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Mistakes</span>
              <span className="text-accent-blue font-semibold">
                {mistakes}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => startGame(selectedSong)}
            className="flex-1 bg-claude-orange text-white font-semibold py-3 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={() => setGameState('menu')}
            className="flex-1 bg-bg-tertiary border border-border text-text-primary px-4 py-3 rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors"
          >
            Song Menu
          </button>
        </div>
      </div>
    );
  }

  return null;
}
