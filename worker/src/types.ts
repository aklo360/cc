/**
 * TypeScript interfaces for the CC Bot
 */

export interface Env {
  // AI APIs
  GEMINI_API_KEY: string; // For image generation
  ANTHROPIC_API_KEY: string; // For text generation (Claude Opus 4.5)
  BASE_IMAGE_URL: string;

  // Twitter OAuth 1.0a (for everything - media upload + tweet posting)
  TWITTER_API_KEY: string; // Consumer Key
  TWITTER_API_SECRET: string; // Consumer Secret
  TWITTER_ACCESS_TOKEN: string; // Access Token
  TWITTER_ACCESS_SECRET: string; // Access Token Secret

  // KV namespace for bot state
  CC_BOT_KV: KVNamespace;
}

export interface BotState {
  last_post_time: number; // Unix timestamp ms
  daily_count: number;
  daily_reset_date: string; // "2024-01-22"
  recent_prompts: string[]; // Last 10 prompts used
  tweet_history: TweetRecord[];
}

export interface TweetRecord {
  id: string;
  caption: string;
  timestamp: number;
  prompt: string;
  quality_score: number;
}

export interface GenerateTweetResult {
  success: boolean;
  tweet_id?: string;
  caption?: string;
  error?: string;
  quality_score?: number;
  attempts?: number;
}
