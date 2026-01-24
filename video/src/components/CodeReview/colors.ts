/**
 * CodeReview Trailer Colors - Exact values from the /review page
 */

export const COLORS = {
  // Backgrounds
  bgPrimary: '#0d0d0d',
  bgSecondary: '#1a1a1a',
  bgTertiary: '#262626',

  // Text
  textPrimary: '#e0e0e0',
  textSecondary: '#a0a0a0',
  textMuted: '#666666',

  // Brand
  claudeOrange: '#da7756',
  claudeOrangeDim: '#c56648',

  // Accent colors
  accentGreen: '#4ade80',
  accentYellow: '#facc15',
  red400: '#f87171',
  red500: '#ef4444',

  // Border
  border: '#333333',
};

// Severity levels for code review issues
export const SEVERITY_CONFIG = {
  mild: { emoji: '😊', label: 'Gentle', color: COLORS.accentGreen },
  spicy: { emoji: '🌶️', label: 'Spicy', color: COLORS.claudeOrange },
  nuclear: { emoji: '💀', label: 'Nuclear', color: COLORS.red500 },
} as const;

// Example review issues for trailer
export const TRAILER_ISSUES = [
  {
    issue: 'var usage',
    roast: "Using 'var' in 2024? That's like showing up to a Tesla factory on a penny-farthing.",
    fix: "Use 'const' or 'let'. Join us in this decade.",
    severity: 'mild' as const,
  },
  {
    issue: 'verbose loops',
    roast: "This for-loop is giving me 'I learned JavaScript from a 2005 textbook' vibes.",
    fix: "Try Array.reduce() or a simple for...of loop. It's not 1999 anymore.",
    severity: 'spicy' as const,
  },
];

// Example code for trailer
export const EXAMPLE_CODE = `function calculateTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total = total + items[i].price;
  }
  return total;
}`;
