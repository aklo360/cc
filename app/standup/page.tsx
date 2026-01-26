'use client';

import { useState } from 'react';
import { StandupGenerator } from './components/StandupGenerator';
import { StandupOutput } from './components/StandupOutput';

export default function StandupPage() {
  const [generatedStandup, setGeneratedStandup] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (input: string, tone: string, length: string) => {
    setIsGenerating(true);

    // Simulate AI generation with a realistic delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const standup = generateStandup(input, tone, length);
    setGeneratedStandup(standup);
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Claude's Daily Standup
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            AI-Powered Standup Generator
          </p>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Transform your boring commits and PRs into hilariously realistic standup updates.
            Because "pushed code" doesn't sound as impressive as "architected a robust solution."
          </p>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Input Side */}
          <StandupGenerator
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />

          {/* Output Side */}
          <StandupOutput
            standup={generatedStandup}
            isGenerating={isGenerating}
          />
        </div>

        {/* Examples Section */}
        <div className="mt-16 p-8 bg-gray-800/50 rounded-xl border border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-purple-400">💡 Pro Tips</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-white mb-2">📝 What to Input</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Git commit messages</li>
                <li>• PR descriptions</li>
                <li>• Quick work notes</li>
                <li>• Bug fix summaries</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">🎭 Choose Your Vibe</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Professional: Impress your boss</li>
                <li>• Casual: Keep it real</li>
                <li>• Dramatic: Maximum impact</li>
                <li>• Humble: Downplay everything</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">⚡ Quick Actions</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• One-click copy to clipboard</li>
                <li>• Regenerate with different tone</li>
                <li>• Adjust length on the fly</li>
                <li>• Works offline after load</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Made with 💜 by Claude • All processing happens in your browser</p>
        </div>
      </div>
    </div>
  );
}

// The actual standup generation logic
function generateStandup(input: string, tone: string, length: string): string {
  const lines = input.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    return "No input provided. Please paste your commits or work notes!";
  }

  // Parse the input and extract key actions
  const actions = lines.map(line => {
    // Remove common prefixes
    let cleaned = line
      .replace(/^[-•*]\s*/, '')
      .replace(/^(fix|feat|chore|docs|style|refactor|test|build)[:(\s]/i, '')
      .replace(/^\[.*?\]\s*/, '')
      .trim();

    return cleaned;
  });

  const yesterdaySection = generateYesterdaySection(actions, tone, length);
  const todaySection = generateTodaySection(actions, tone, length);
  const blockersSection = generateBlockersSection(tone);

  return `**Yesterday:**\n${yesterdaySection}\n\n**Today:**\n${todaySection}\n\n**Blockers:**\n${blockersSection}`;
}

function generateYesterdaySection(actions: string[], tone: string, length: string): string {
  const toneTemplates = {
    professional: [
      "Successfully implemented {action}",
      "Completed work on {action}",
      "Delivered {action}",
      "Finished {action} ahead of schedule",
    ],
    casual: [
      "Got {action} working",
      "Wrapped up {action}",
      "Knocked out {action}",
      "Finally finished {action}",
    ],
    dramatic: [
      "Heroically conquered {action}",
      "Architected and deployed a groundbreaking solution for {action}",
      "Orchestrated a masterful implementation of {action}",
      "Revolutionized {action}",
    ],
    humble: [
      "Made a small change to {action}",
      "Did some work on {action}",
      "Tweaked {action} a bit",
      "Made minor improvements to {action}",
    ],
  };

  const templates = toneTemplates[tone as keyof typeof toneTemplates] || toneTemplates.professional;
  const maxItems = length === 'short' ? 2 : length === 'medium' ? 3 : 5;

  return actions
    .slice(0, maxItems)
    .map(action => {
      const template = templates[Math.floor(Math.random() * templates.length)];
      return `• ${template.replace('{action}', action)}`;
    })
    .join('\n');
}

function generateTodaySection(actions: string[], tone: string, length: string): string {
  const toneTemplates = {
    professional: [
      "Will focus on {action}",
      "Planning to address {action}",
      "Working on {action}",
      "Prioritizing {action}",
    ],
    casual: [
      "Gonna tackle {action}",
      "Working on {action}",
      "Focusing on {action}",
      "Diving into {action}",
    ],
    dramatic: [
      "Will embark on an epic quest to {action}",
      "Preparing to revolutionize {action}",
      "Setting out to masterfully craft {action}",
      "Ready to architect {action}",
    ],
    humble: [
      "Might work on {action}",
      "Hoping to make progress on {action}",
      "Will try to {action}",
      "Planning to look at {action}",
    ],
  };

  const generalPlans = {
    professional: [
      "Continue monitoring production systems",
      "Review and respond to team feedback",
      "Participate in scheduled meetings",
      "Document recent changes",
    ],
    casual: [
      "Keep an eye on things",
      "Catch up with the team",
      "Do some code reviews",
      "Maybe write some docs",
    ],
    dramatic: [
      "Vigilantly guard our production environment",
      "Collaborate with fellow engineers on mission-critical initiatives",
      "Strategically align on roadmap priorities",
      "Craft comprehensive documentation",
    ],
    humble: [
      "Just keeping things running",
      "Helping out where needed",
      "Being available for questions",
      "Trying to stay on top of things",
    ],
  };

  const templates = toneTemplates[tone as keyof typeof toneTemplates] || toneTemplates.professional;
  const plans = generalPlans[tone as keyof typeof generalPlans] || generalPlans.professional;

  const maxItems = length === 'short' ? 2 : length === 'medium' ? 3 : 4;
  const items: string[] = [];

  // Use some future-oriented actions
  const futureActions = actions.map(action => {
    if (action.toLowerCase().includes('fix')) {
      return action.replace(/fix(ed)?/gi, 'enhance');
    }
    if (action.toLowerCase().includes('implement')) {
      return action.replace(/implement(ed)?/gi, 'optimize');
    }
    if (action.toLowerCase().includes('add')) {
      return action.replace(/add(ed)?/gi, 'extend');
    }
    return action;
  });

  futureActions.slice(0, Math.max(1, maxItems - 1)).forEach(action => {
    const template = templates[Math.floor(Math.random() * templates.length)];
    items.push(`• ${template.replace('{action}', action)}`);
  });

  // Add a general plan
  if (items.length < maxItems) {
    const plan = plans[Math.floor(Math.random() * plans.length)];
    items.push(`• ${plan}`);
  }

  return items.join('\n');
}

function generateBlockersSection(tone: string): string {
  const blockerOptions = {
    professional: [
      "None at this time",
      "No current blockers",
      "All dependencies resolved",
      "Operating without impediments",
    ],
    casual: [
      "Nope, all good!",
      "Nothing blocking me",
      "We're good",
      "All clear",
    ],
    dramatic: [
      "Despite overwhelming odds, no blockers impede our progress!",
      "All obstacles have been vanquished",
      "The path forward is clear and unobstructed",
      "No force in the codebase can stop us",
    ],
    humble: [
      "Nothing worth mentioning",
      "I'll figure it out",
      "Nothing I can't handle",
      "All good on my end",
    ],
  };

  const options = blockerOptions[tone as keyof typeof blockerOptions] || blockerOptions.professional;
  return options[Math.floor(Math.random() * options.length)];
}
