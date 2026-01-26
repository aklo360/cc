'use client';

interface ConfessionResponseProps {
  confession: string;
  response: string;
  onReset: () => void;
}

export function ConfessionResponse({ confession, response, onReset }: ConfessionResponseProps) {
  const getSinLevel = (response: string): { level: string; color: string; emoji: string } => {
    if (response.includes('ALARM') || response.includes('security') || response.includes('🚨')) {
      return { level: 'CRITICAL SIN', color: 'text-red-500', emoji: '🚨' };
    }
    if (response.includes('WHOA') || response.includes('force push') || response.includes('😱')) {
      return { level: 'MAJOR SIN', color: 'text-orange-500', emoji: '⚠️' };
    }
    if (response.includes('Oof') || response.includes('😬')) {
      return { level: 'MODERATE SIN', color: 'text-yellow-500', emoji: '😬' };
    }
    if (response.includes('universal truth') || response.includes('absolved') || response.includes('✨')) {
      return { level: 'FORGIVEN', color: 'text-green-500', emoji: '✨' };
    }
    return { level: 'MINOR SIN', color: 'text-purple-500', emoji: '😅' };
  };

  const sinLevel = getSinLevel(response);

  return (
    <div className="space-y-6">
      {/* Sin Level Badge */}
      <div className="flex justify-center">
        <div className={`inline-flex items-center gap-2 px-6 py-3 bg-gray-800/50 backdrop-blur-sm rounded-full border border-purple-500/30 ${sinLevel.color} font-bold text-lg`}>
          <span className="text-2xl">{sinLevel.emoji}</span>
          {sinLevel.level}
        </div>
      </div>

      {/* Your Confession */}
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
          Your Confession:
        </h3>
        <p className="text-gray-300 italic leading-relaxed">
          "{confession}"
        </p>
      </div>

      {/* AI Response */}
      <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-xl p-8 border border-purple-500/30 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-2xl">
            🧙‍♂️
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-purple-300 mb-3">
              The Judgment:
            </h3>
            <p className="text-gray-200 leading-relaxed whitespace-pre-line">
              {response}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center pt-4">
        <button
          onClick={onReset}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          🙏 Confess Another Sin
        </button>
        <button
          onClick={() => {
            const text = `My Confession: "${confession}"\n\nThe Judgment: ${response}`;
            navigator.clipboard.writeText(text);
            alert('Confession copied to clipboard! Share your shame. 😅');
          }}
          className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-8 rounded-lg transition-all duration-200"
        >
          📋 Copy to Clipboard
        </button>
      </div>

      {/* Inspirational Quote */}
      <div className="text-center pt-8">
        <p className="text-sm text-gray-500 italic">
          "Every bug is a lesson. Every hack is a story. Every developer is fighting their own battle with technical debt."
        </p>
        <p className="text-xs text-gray-600 mt-2">— Ancient DevOps Proverb</p>
      </div>
    </div>
  );
}
