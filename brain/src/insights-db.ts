/**
 * Insights Database - Cumulative Learning System
 *
 * The brain learns over time by storing insights from thinking sessions.
 * Insights are retrieved and used in future sessions, creating genuine
 * cumulative intelligence.
 *
 * This file re-exports from db.ts for cleaner imports and adds
 * higher-level helper functions for the reasoning engine.
 */

import {
  storeInsight as dbStoreInsight,
  getInsightsByCategory as dbGetInsightsByCategory,
  getAllInsights as dbGetAllInsights,
  referenceInsight as dbReferenceInsight,
  updateInsightConfidence as dbUpdateInsightConfidence,
  invalidateInsight as dbInvalidateInsight,
  getInsightStats as dbGetInsightStats,
  type GrindInsight,
  type InsightConfidence,
} from './db.js';
import type { ProblemCategory } from './problems.js';

// Re-export types
export type { GrindInsight, InsightConfidence };

// ============ INSIGHT STORAGE ============

/**
 * Store a new insight from a thinking session
 */
export function storeInsight(
  insight: string,
  category: string,
  sessionId?: string,
  supportingData?: Record<string, unknown>
): number {
  return dbStoreInsight(insight, category, sessionId, supportingData);
}

/**
 * Store multiple insights at once
 */
export function storeInsights(
  insights: Array<{
    insight: string;
    category: string;
    sessionId?: string;
    supportingData?: Record<string, unknown>;
  }>
): number[] {
  return insights.map(i => storeInsight(i.insight, i.category, i.sessionId, i.supportingData));
}

// ============ INSIGHT RETRIEVAL ============

/**
 * Get insights relevant to a problem category
 * Used when starting a thinking session to provide context
 */
export function getRelevantInsights(category: ProblemCategory | string): GrindInsight[] {
  return dbGetInsightsByCategory(category);
}

/**
 * Get all valid insights
 */
export function getAllInsights(): GrindInsight[] {
  return dbGetAllInsights();
}

/**
 * Get insights formatted as context for the reasoning prompt
 */
export function getInsightsForPrompt(category: string, maxInsights: number = 5): string[] {
  const insights = getRelevantInsights(category);

  // Prioritize proven > tested > hypothesis
  const sorted = [...insights].sort((a, b) => {
    const order = { proven: 0, tested: 1, hypothesis: 2 };
    return order[a.confidence] - order[b.confidence];
  });

  // Take top N and format for prompt
  return sorted.slice(0, maxInsights).map(i => {
    const confidence = i.confidence === 'proven' ? '[proven]' :
                       i.confidence === 'tested' ? '[tested]' : '[hypothesis]';
    return `${confidence} ${i.insight}`;
  });
}

/**
 * Get a summary of insights for display
 */
export function getInsightsSummary(): {
  total: number;
  byConfidence: { hypothesis: number; tested: number; proven: number };
  byCategory: Record<string, number>;
  mostUsed: GrindInsight[];
} {
  const all = getAllInsights();
  const stats = dbGetInsightStats();

  // Count by category
  const byCategory: Record<string, number> = {};
  for (const insight of all) {
    byCategory[insight.category] = (byCategory[insight.category] || 0) + 1;
  }

  // Get most referenced insights
  const mostUsed = [...all]
    .sort((a, b) => b.timesReferenced - a.timesReferenced)
    .slice(0, 5);

  return {
    total: stats.total,
    byConfidence: {
      hypothesis: stats.hypothesis,
      tested: stats.tested,
      proven: stats.proven,
    },
    byCategory,
    mostUsed,
  };
}

// ============ INSIGHT USAGE TRACKING ============

/**
 * Mark insight as referenced (called when insight is used in a session)
 */
export function referenceInsight(insightId: number): void {
  dbReferenceInsight(insightId);
}

/**
 * Mark multiple insights as referenced
 */
export function referenceInsights(insightIds: number[]): void {
  for (const id of insightIds) {
    dbReferenceInsight(id);
  }
}

// ============ INSIGHT LIFECYCLE ============

/**
 * Promote insight confidence level
 * hypothesis -> tested -> proven
 */
export function promoteInsight(insightId: number): void {
  const all = getAllInsights();
  const insight = all.find(i => i.id === insightId);
  if (!insight) return;

  const promotion: Record<InsightConfidence, InsightConfidence> = {
    hypothesis: 'tested',
    tested: 'proven',
    proven: 'proven',
  };

  dbUpdateInsightConfidence(insightId, promotion[insight.confidence]);
}

/**
 * Update insight confidence directly
 */
export function updateInsightConfidence(insightId: number, confidence: InsightConfidence): void {
  dbUpdateInsightConfidence(insightId, confidence);
}

/**
 * Mark insight as invalid (disproven or outdated)
 */
export function invalidateInsight(insightId: number): void {
  dbInvalidateInsight(insightId);
}

// ============ INSIGHT EXTRACTION ============

/**
 * Parse a conclusion text to extract potential insights
 * Called when a thinking session ends
 */
export function extractInsightsFromConclusion(
  conclusion: string,
  category: string
): string[] {
  // Simple extraction: look for key phrases that indicate insights
  const insightPatterns = [
    /(?:conclusion|insight|learning|takeaway):\s*(.+?)(?:\.|$)/gi,
    /(?:we should|i should|need to)\s+(.+?)(?:\.|$)/gi,
    /(?:the key is|the answer is|what works is)\s+(.+?)(?:\.|$)/gi,
  ];

  const insights: string[] = [];

  for (const pattern of insightPatterns) {
    let match;
    while ((match = pattern.exec(conclusion)) !== null) {
      const insight = match[1].trim();
      if (insight.length > 10 && insight.length < 200) {
        insights.push(insight);
      }
    }
  }

  // If no patterns matched, use the conclusion itself if it's short enough
  if (insights.length === 0 && conclusion.length < 200) {
    insights.push(conclusion);
  }

  return insights;
}

// ============ INSIGHT STATS ============

/**
 * Get insight statistics
 */
export function getInsightStats(): { total: number; hypothesis: number; tested: number; proven: number } {
  return dbGetInsightStats();
}
