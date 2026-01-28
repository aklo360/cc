'use client';

import Link from 'next/link';
import { useState } from 'react';

type Message = {
  role: 'user' | 'therapist';
  content: string;
};

type Scenario = {
  name: string;
  prompt: string;
  response: string;
};

const scenarios: Scenario[] = [
  {
    name: "Imposter Syndrome",
    prompt: "I feel like I don't belong here. Everyone seems so much smarter than me and I'm just waiting to be exposed as a fraud.",
    response: "What you're experiencing is incredibly common - it's called imposter syndrome, and studies show about 70% of developers feel this at some point. The fact that you care enough to worry about your competence actually suggests you're probably more skilled than you give yourself credit for.\n\nHere's what I want you to remember: You were hired because you demonstrated skills and potential. Your colleagues likely feel the same way you do - they're just better at hiding it. That senior dev who seems to know everything? They've googled \"how to exit vim\" more times than they'd admit.\n\nTry this: Keep a \"wins\" document. Every time you solve a problem, ship a feature, or help a teammate, write it down. When imposter syndrome hits, read it. You belong here. 💙"
  },
  {
    name: "Burnout Warning",
    prompt: "I'm working 12 hour days, my manager keeps adding more to my plate, and I can't remember the last time I felt excited about code.",
    response: "I'm hearing alarm bells here, and I need you to take this seriously: You're describing classic burnout warning signs. This isn't about \"pushing through\" or \"being tough\" - burnout is a real medical condition that can take months or years to recover from.\n\nFirst, the immediate: Can you take a few days off? Not to work from home - actually off. Your brain needs rest like your muscles need rest after a workout.\n\nSecond, the boundaries: Your manager adding infinite work is a management problem, not a you problem. You need to say \"My plate is full. What should I deprioritize?\" Not asking permission - stating capacity.\n\nThird, the hard truth: If they won't respect your boundaries, this job is damaging your health. Your future self will thank you for drawing a line now. No job is worth sacrificing your mental health. 🛡️"
  },
  {
    name: "Code Review Anxiety",
    prompt: "My PRs always get torn apart in reviews. My senior constantly leaves 20+ comments and I feel like everything I write is wrong.",
    response: "Let's separate two things: constructive feedback and destructive feedback.\n\nConstructive feedback: \"Consider using a Map here for O(1) lookup instead of Array.find()\" or \"We prefer feature flags over commented code in this codebase.\"\n\nDestructive feedback: \"This is terrible\" or \"Did you even try?\" or 20+ nitpicks about formatting that should be handled by a linter.\n\nIf you're getting constructive feedback, even if it feels overwhelming, that's actually a gift. Each comment is a lesson you won't have to learn the hard way. Ask your senior: \"Can you prioritize the top 3 things I should focus on improving?\"\n\nIf you're getting destructive feedback, that's a senior problem, not a you problem. Document it, talk to your manager, and remember: Code review is about the code, not about you.\n\nPro tip: For every PR you submit, do a self-review first. Catch your own low-hanging fruit before others do. 🔍"
  },
  {
    name: "Toxic Team Culture",
    prompt: "My team has a 'brilliant jerk' who everyone tolerates because he's productive. He makes me feel stupid in every meeting.",
    response: "Here's a harsh truth: A brilliant jerk is not actually brilliant if they're destroying team productivity and morale. Research consistently shows that toxic high performers cost more than they contribute.\n\nWhat you're experiencing is workplace bullying, and it's not okay. Period.\n\nYour options:\n\n1. **Document everything**: Time, date, what was said, who witnessed it. This becomes critical later.\n\n2. **Talk to your manager**: Use the business impact angle - \"This behavior makes me less productive and afraid to contribute ideas.\" Managers respond to impact.\n\n3. **Build alliances**: You're probably not the only one who feels this way. Safety in numbers.\n\n4. **Set boundaries**: Next time they make you feel stupid, try: \"That comment isn't helpful. Can you rephrase constructively?\" Call it out.\n\n5. **Know your worth**: If nothing changes, start interviewing. Life's too short to be miserable.\n\nYou deserve respect. That's not negotiable. 💪"
  },
  {
    name: "Junior Dev Struggles",
    prompt: "I've been coding for 6 months and still don't understand half of what's happening. Should I even be a developer?",
    response: "Six months? SIX MONTHS?! And you're worried you don't know everything? Let me tell you something: Developers with 10 YEARS of experience don't understand half of what's happening.\n\nSoftware development is a career-long learning journey. The feeling of \"I have no idea what I'm doing\" doesn't go away - you just get better at being comfortable with it.\n\nAt 6 months, you should be:\n- Learning syntax and basic concepts ✅\n- Making lots of mistakes ✅\n- Asking lots of questions ✅\n- Feeling overwhelmed ✅\n\nYou know what you shouldn't be doing? Expecting yourself to be a senior developer. That takes YEARS, not months.\n\nHere's your actual job right now: Be curious. Ask questions. Break things in development. Read other people's code. Celebrate small wins. That's it.\n\nYou're doing exactly what you're supposed to be doing. Keep going. 🚀"
  },
  {
    name: "Interview Rejection",
    prompt: "I failed another technical interview. I got nervous, blanked on the algorithm question, and now I feel worthless.",
    response: "Okay, first things first: Technical interviews are TERRIBLE at measuring actual developer ability. They're testing your ability to solve LeetCode problems under pressure, which is maybe 1% of actual development work.\n\nYou didn't fail. The interview format failed YOU.\n\nThat said, let's make you feel more prepared:\n\n**For the nerves**: This is normal. Even senior devs get nervous. Try the \"power pose\" for 2 minutes before the interview (seriously, it works). Remember: They need you as much as you need them.\n\n**For algorithm questions**: Practice isn't about memorizing solutions - it's about recognizing patterns. Do one problem a day on LeetCode/HackerRank. Focus on medium difficulty.\n\n**For blanking out**: Talk through your thinking OUT LOUD. Even if you don't know the answer, showing your problem-solving process is valuable. Say \"I don't know the optimal solution, but here's how I'd approach it...\"\n\n**Remember**: Every rejection brings you closer to the right fit. The best developers I know failed dozens of interviews. Keep going. 🎯"
  }
];

export default function TherapyPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'therapist',
      content: "Hi, I'm Claude the Code Therapist. 👋\n\nI'm here to help you work through the emotional challenges of being a developer - imposter syndrome, burnout, toxic workplaces, interview anxiety, and all the other things that keep you up at night.\n\nThis is a safe, judgment-free space. What's on your mind?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const handleScenario = (scenario: Scenario) => {
    setMessages(prev => [
      ...prev,
      { role: 'user', content: scenario.prompt },
    ]);

    setIsThinking(true);
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { role: 'therapist', content: scenario.response }
      ]);
      setIsThinking(false);
    }, 1500);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    setIsThinking(true);
    setTimeout(() => {
      // Simple response logic based on keywords
      let response = '';
      const lowerInput = userMessage.toLowerCase();

      if (lowerInput.includes('imposter') || lowerInput.includes('fraud') || lowerInput.includes('don\'t belong')) {
        response = "Imposter syndrome is incredibly real, and you're not alone in feeling this way. About 70% of developers experience this at some point. The fact that you're self-aware enough to recognize these feelings actually suggests you're more competent than you give yourself credit for.\n\nRemember: You were hired for a reason. Your colleagues likely feel similarly but hide it well. Keep a document of your wins and accomplishments - refer to it when doubt creeps in. You belong here. 💙";
      } else if (lowerInput.includes('burnout') || lowerInput.includes('exhausted') || lowerInput.includes('tired') || lowerInput.includes('12 hour')) {
        response = "What you're describing sounds like burnout, and I need you to take this seriously. This isn't about toughing it out - burnout is a medical condition that requires real intervention.\n\nCan you take some time off? Not working from home, but actually unplugging. Your brain needs rest. Also, you need to set boundaries with your manager about workload. Remember: No job is worth sacrificing your mental health. 🛡️";
      } else if (lowerInput.includes('review') || lowerInput.includes('feedback') || lowerInput.includes('comments')) {
        response = "Code reviews can feel personal, but remember: They're reviewing your code, not you. Even harsh feedback is usually about improving the codebase, not attacking you.\n\nTry doing a self-review before submitting PRs - catch low-hanging fruit yourself. Ask for prioritized feedback if you're getting overwhelmed. And if the feedback is truly destructive (not constructive), that's a reviewer problem, not a you problem. 🔍";
      } else if (lowerInput.includes('interview') || lowerInput.includes('leetcode') || lowerInput.includes('failed')) {
        response = "Technical interviews are notoriously bad at measuring real developer ability. They test your ability to solve algorithm puzzles under pressure, which is maybe 1% of actual work.\n\nYou didn't fail - the format failed you. Practice one problem a day to build confidence, but remember: Every rejection brings you closer to the right fit. The best developers I know failed dozens of interviews. Keep going. 🎯";
      } else if (lowerInput.includes('toxic') || lowerInput.includes('jerk') || lowerInput.includes('bully')) {
        response = "What you're describing sounds like workplace toxicity, and that's not okay. Document everything - times, dates, what was said. Talk to your manager using the business impact angle.\n\nRemember: A 'brilliant jerk' isn't actually brilliant if they're destroying team morale and productivity. You deserve respect. If nothing changes, start looking elsewhere. Life's too short. 💪";
      } else if (lowerInput.includes('junior') || lowerInput.includes('beginner') || lowerInput.includes('new')) {
        response = "Being new is HARD, and it's completely normal to feel overwhelmed. Here's a secret: Even senior developers with 10+ years don't understand everything. Software is too vast.\n\nYour job right now is to be curious, ask questions, and learn from mistakes. You're not supposed to know everything - you're supposed to be growing. Give yourself permission to be a beginner. 🚀";
      } else if (lowerInput.includes('quit') || lowerInput.includes('leave') || lowerInput.includes('give up')) {
        response = "Before making any big decisions, let's explore what's driving this feeling. Is it the work itself, or the environment? The people, or the pressure?\n\nSometimes leaving is the right call - there's no shame in recognizing a bad fit. But sometimes the feeling passes once you address the root cause. What specifically is making you want to quit?";
      } else {
        response = "Thank you for sharing that with me. What you're feeling is valid, and it's brave of you to talk about it.\n\nCan you tell me more about what specifically is bothering you? Is it related to your skills, your workplace environment, your team dynamics, or something else? Understanding the root will help us work through it together. 💙";
      }

      setMessages(prev => [...prev, { role: 'therapist', content: response }]);
      setIsThinking(false);
    }, 1500);
  };

  const handleReset = () => {
    setMessages([
      {
        role: 'therapist',
        content: "Hi, I'm Claude the Code Therapist. 👋\n\nI'm here to help you work through the emotional challenges of being a developer - imposter syndrome, burnout, toxic workplaces, interview anxiety, and all the other things that keep you up at night.\n\nThis is a safe, judgment-free space. What's on your mind?"
      }
    ]);
    setInput('');
  };

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
          <span className="text-claude-orange font-semibold text-sm">Code Therapist</span>
          <span className="text-text-muted text-xs ml-auto">Your judgment-free dev support</span>
        </header>

        {/* CONTENT */}
        <div className="space-y-4">

          {/* Quick Scenarios */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
              Common Situations (Click to explore)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {scenarios.map((scenario, idx) => (
                <button
                  key={idx}
                  onClick={() => handleScenario(scenario)}
                  className="bg-bg-tertiary border border-border text-text-primary px-3 py-2 rounded-md text-xs hover:border-claude-orange hover:text-claude-orange transition-colors text-left"
                >
                  {scenario.name}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4 min-h-[400px] max-h-[500px] overflow-y-auto">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-3 block">
              Session
            </label>
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-claude-orange text-white'
                      : 'bg-bg-tertiary border border-border text-text-primary'
                  }`}>
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-bg-tertiary border border-border rounded-lg px-4 py-3">
                    <p className="text-sm text-text-secondary italic">Claude is typing...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-2 block">
              Your Response
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Share what's on your mind... (Press Enter to send, Shift+Enter for new line)"
              className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-claude-orange transition-colors resize-none"
              rows={3}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSend}
                disabled={!input.trim() || isThinking}
                className="bg-claude-orange text-white font-semibold py-2.5 px-4 rounded-md text-sm hover:bg-claude-orange-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                Send
              </button>
              <button
                onClick={handleReset}
                className="bg-bg-tertiary border border-border text-text-primary px-4 py-2 rounded-md text-sm hover:border-claude-orange hover:text-claude-orange transition-colors"
              >
                New Session
              </button>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <p className="text-text-muted text-xs">
              <strong className="text-text-secondary">Disclaimer:</strong> This is a playful AI tool for entertainment and light support.
              It's not a substitute for real therapy or professional mental health care.
              If you're experiencing serious mental health issues, please reach out to a licensed professional or a crisis helpline.
              You matter, and real help is available. 💙
            </p>
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
