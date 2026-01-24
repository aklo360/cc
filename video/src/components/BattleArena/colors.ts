// Exact color palette from the Next.js app (globals.css)
export const COLORS = {
  bgPrimary: '#0d0d0d',
  bgSecondary: '#1a1a1a',
  bgTertiary: '#262626',
  textPrimary: '#e0e0e0',
  textSecondary: '#a0a0a0',
  textMuted: '#666',
  claudeOrange: '#da7756',
  claudeOrangeDim: '#b8654a',
  accentGreen: '#4ade80',
  accentBlue: '#60a5fa',
  accentPurple: '#a78bfa',
  accentYellow: '#fbbf24',
  border: '#333',
};

// Challenge interface matching challenges.ts
export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  starterCode: string;
}

// Sample challenges for trailer (from actual challenges.ts)
export const TRAILER_CHALLENGES: Challenge[] = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    description: 'Given an array of integers and a target sum, return indices of two numbers that add up to the target.',
    difficulty: 'easy',
    category: 'Arrays',
    starterCode: `function twoSum(nums, target) {
  // Your code here
}`,
  },
  {
    id: 'reverse-string',
    title: 'Reverse String',
    description: 'Write a function that reverses a string without using built-in reverse methods.',
    difficulty: 'easy',
    category: 'Strings',
    starterCode: `function reverseString(str) {
  // Your code here
}`,
  },
  {
    id: 'count-vowels',
    title: 'Count Vowels',
    description: 'Count the number of vowels (a, e, i, o, u) in a string (case-insensitive).',
    difficulty: 'easy',
    category: 'Strings',
    starterCode: `function countVowels(str) {
  // Your code here
}`,
  },
  {
    id: 'fizzbuzz',
    title: 'FizzBuzz',
    description: "Return an array where numbers divisible by 3 are 'Fizz', by 5 are 'Buzz', by both are 'FizzBuzz'.",
    difficulty: 'easy',
    category: 'Logic',
    starterCode: `function fizzBuzz(n) {
  // Your code here
}`,
  },
  {
    id: 'max-subarray',
    title: 'Maximum Subarray Sum',
    description: "Find the contiguous subarray with the largest sum (Kadane's algorithm).",
    difficulty: 'medium',
    category: 'Arrays',
    starterCode: `function maxSubArray(nums) {
  // Your code here
}`,
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    description: 'Check if a string of parentheses is valid (properly opened and closed).',
    difficulty: 'medium',
    category: 'Stack',
    starterCode: `function isValidParens(str) {
  // Your code here
}`,
  },
];

// Daily challenge for trailer (first one)
export const DAILY_CHALLENGE = TRAILER_CHALLENGES[0];
