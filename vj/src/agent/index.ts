/**
 * VJ Agent - Claude Agent SDK Integration
 *
 * Provides tools for Claude to control the VJ in real-time:
 * - Switch engines (Three.js, Hydra, Remotion)
 * - Switch visual styles
 * - Modify parameters (intensity, speed, zoom, etc.)
 * - Write custom Hydra code
 * - Analyze music mood
 */

import Anthropic from '@anthropic-ai/sdk';
import type { VJ, EngineType, VJState } from '../index.js';
import type { VisualStyle } from '../engines/types.js';
import { HydraEngine, HYDRA_PRESETS } from '../engines/hydra/index.js';

// Tool definitions for Claude
const VJ_TOOLS: Anthropic.Tool[] = [
  {
    name: 'switch_engine',
    description:
      'Switch the visual rendering engine. Three.js is 3D with particles and geometry. Hydra is 2D live-coding shader art. Remotion is frame-based animation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        engine: {
          type: 'string',
          enum: ['threejs', 'hydra', 'remotion'],
          description: 'The engine to switch to',
        },
      },
      required: ['engine'],
    },
  },
  {
    name: 'switch_style',
    description:
      'Switch the visual style preset. Abstract is pure geometry. Branded uses $CC colors (orange). Synthwave is neon 80s. Auto picks based on music.',
    input_schema: {
      type: 'object' as const,
      properties: {
        style: {
          type: 'string',
          enum: ['abstract', 'branded', 'synthwave', 'auto'],
          description: 'The style preset to use',
        },
      },
      required: ['style'],
    },
  },
  {
    name: 'set_parameter',
    description:
      'Adjust a visual parameter. Intensity (0-2) controls overall reactivity. Speed (0.5-2) controls animation speed. Zoom (0.5-2) controls camera distance. ColorShift (0-1) rotates hue.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          enum: ['intensity', 'speed', 'zoom', 'colorShift', 'feedback', 'bloomStrength'],
          description: 'Parameter name',
        },
        value: {
          type: 'number',
          description: 'Parameter value (typically 0-2)',
        },
      },
      required: ['name', 'value'],
    },
  },
  {
    name: 'write_hydra_code',
    description:
      'Write custom Hydra shader code (only works when Hydra engine is active). Use audio variables: a.bass, a.mid, a.high, a.overall, a.beat. Example: osc(10, 0.1, () => a.bass).out()',
    input_schema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'Hydra code to execute. Must end with .out() to render.',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'use_hydra_preset',
    description:
      'Use a built-in Hydra preset (only works when Hydra engine is active).',
    input_schema: {
      type: 'object' as const,
      properties: {
        preset: {
          type: 'string',
          enum: ['bassCircle', 'midWave', 'highSparkle', 'spectrum', 'tunnel'],
          description: 'Preset name',
        },
      },
      required: ['preset'],
    },
  },
  {
    name: 'get_audio_state',
    description: 'Get current audio analysis data including frequency bands and BPM.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'analyze_mood',
    description:
      'Analyze the current music mood based on frequency characteristics. Returns suggested style and parameters.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

export interface VJAgentConfig {
  apiKey?: string;
  model?: string;
  systemPrompt?: string;
}

/**
 * VJ Agent - Claude-powered controller for the VJ
 */
export class VJAgent {
  private client: Anthropic;
  private vj: VJ;
  private model: string;
  private systemPrompt: string;
  private conversationHistory: Anthropic.MessageParam[] = [];

  constructor(vj: VJ, config: VJAgentConfig = {}) {
    this.vj = vj;
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.systemPrompt =
      config.systemPrompt ||
      `You are a VJ (visual jockey) assistant controlling live audio-reactive visuals.

Your job is to create the best visual experience for the music being played.

Available tools:
- switch_engine: Change rendering engine (threejs=3D, hydra=shaders, remotion=animation)
- switch_style: Change visual preset (abstract, branded, synthwave, auto)
- set_parameter: Adjust intensity, speed, zoom, colorShift
- write_hydra_code: Write custom shader code (Hydra engine only)
- use_hydra_preset: Use built-in Hydra presets
- get_audio_state: Check current audio levels and BPM
- analyze_mood: Get AI analysis of music mood

Guidelines:
- Match visuals to music energy (high energy = high intensity, fast)
- Use Hydra for experimental/psychedelic looks
- Use Three.js for polished 3D scenes
- Respond to user requests naturally
- Be creative but don't overload - subtle changes often work best
- When music is calm, reduce intensity and speed`;
  }

  /**
   * Process a user command and execute appropriate actions
   */
  async processCommand(userMessage: string): Promise<string> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    // Call Claude with tools
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: this.systemPrompt,
      tools: VJ_TOOLS,
      messages: this.conversationHistory,
    });

    // Process response
    let assistantContent: Anthropic.ContentBlock[] = [];
    let textResponse = '';

    for (const block of response.content) {
      assistantContent.push(block);

      if (block.type === 'text') {
        textResponse += block.text;
      } else if (block.type === 'tool_use') {
        // Execute tool
        const result = await this.executeTool(block.name, block.input as Record<string, unknown>);

        // Add tool result to conversation
        this.conversationHistory.push({
          role: 'assistant',
          content: assistantContent,
        });

        this.conversationHistory.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            },
          ],
        });

        // Get follow-up response
        const followUp = await this.client.messages.create({
          model: this.model,
          max_tokens: 1024,
          system: this.systemPrompt,
          tools: VJ_TOOLS,
          messages: this.conversationHistory,
        });

        // Process follow-up
        for (const followUpBlock of followUp.content) {
          if (followUpBlock.type === 'text') {
            textResponse += followUpBlock.text;
          }
        }

        assistantContent = followUp.content;
      }
    }

    // Add final assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: assistantContent,
    });

    return textResponse || 'Done!';
  }

  /**
   * Execute a VJ tool
   */
  private async executeTool(
    name: string,
    input: Record<string, unknown>
  ): Promise<unknown> {
    switch (name) {
      case 'switch_engine':
        await this.vj.setEngine(input.engine as EngineType);
        return { success: true, engine: input.engine };

      case 'switch_style':
        this.vj.setStyle(input.style as VisualStyle);
        return { success: true, style: input.style };

      case 'set_parameter':
        this.vj.setParameter(input.name as string, input.value as number);
        return { success: true, parameter: input.name, value: input.value };

      case 'write_hydra_code': {
        const engine = this.vj.getEngine();
        if (engine instanceof HydraEngine) {
          engine.executeCode(input.code as string);
          return { success: true, code: input.code };
        }
        return { success: false, error: 'Hydra engine not active' };
      }

      case 'use_hydra_preset': {
        const engine = this.vj.getEngine();
        if (engine instanceof HydraEngine) {
          const preset = HYDRA_PRESETS[input.preset as keyof typeof HYDRA_PRESETS];
          if (preset) {
            engine.executeCode(preset);
            return { success: true, preset: input.preset };
          }
          return { success: false, error: 'Unknown preset' };
        }
        return { success: false, error: 'Hydra engine not active' };
      }

      case 'get_audio_state': {
        const state = this.vj.getState();
        return {
          audio: state.audio,
          beat: state.beat,
          bpm: state.beat?.bpm,
        };
      }

      case 'analyze_mood': {
        const state = this.vj.getState();
        if (!state.audio) {
          return { mood: 'unknown', suggestion: 'No audio data available' };
        }

        const { bands } = state.audio;
        const bpm = state.beat?.bpm;

        // Simple mood analysis based on frequency distribution
        let mood: string;
        let suggestedStyle: VisualStyle;
        let suggestedIntensity: number;

        if (bands.bass > 0.6 && (bpm || 0) > 120) {
          mood = 'energetic/dance';
          suggestedStyle = 'synthwave';
          suggestedIntensity = 1.5;
        } else if (bands.high > 0.5 && bands.mid > 0.4) {
          mood = 'bright/uplifting';
          suggestedStyle = 'abstract';
          suggestedIntensity = 1.2;
        } else if (bands.bass > 0.4 && bands.mid < 0.3) {
          mood = 'dark/heavy';
          suggestedStyle = 'branded';
          suggestedIntensity = 1.3;
        } else {
          mood = 'chill/ambient';
          suggestedStyle = 'abstract';
          suggestedIntensity = 0.8;
        }

        return {
          mood,
          bpm,
          frequencyBalance: {
            bassHeavy: bands.bass > 0.5,
            midHeavy: bands.mid > 0.5,
            highHeavy: bands.high > 0.5,
          },
          suggestion: {
            style: suggestedStyle,
            intensity: suggestedIntensity,
            speed: (bpm || 120) > 140 ? 1.5 : (bpm || 120) < 100 ? 0.7 : 1,
          },
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get available tools for reference
   */
  getTools(): Anthropic.Tool[] {
    return VJ_TOOLS;
  }
}

/**
 * Quick command parser for simple commands without calling Claude API
 * Returns null if command should be processed by Claude
 */
export function parseQuickCommand(
  command: string,
  vj: VJ
): string | null {
  const cmd = command.toLowerCase().trim();

  // Engine shortcuts
  if (cmd === 'three' || cmd === 'threejs' || cmd === '3d') {
    vj.setEngine('threejs');
    return 'Switched to Three.js engine';
  }
  if (cmd === 'hydra' || cmd === 'shader') {
    vj.setEngine('hydra');
    return 'Switched to Hydra engine';
  }
  if (cmd === 'remotion' || cmd === 'anim') {
    vj.setEngine('remotion');
    return 'Switched to Remotion engine';
  }

  // Style shortcuts
  if (cmd === 'abstract' || cmd === 'abs') {
    vj.setStyle('abstract');
    return 'Switched to abstract style';
  }
  if (cmd === 'branded' || cmd === 'cc') {
    vj.setStyle('branded');
    return 'Switched to $CC branded style';
  }
  if (cmd === 'synthwave' || cmd === 'synth' || cmd === 'neon') {
    vj.setStyle('synthwave');
    return 'Switched to synthwave style';
  }
  if (cmd === 'auto') {
    vj.setStyle('auto');
    return 'Switched to auto style';
  }

  // Parameter shortcuts
  const intensityMatch = cmd.match(/^intensity\s+(\d+\.?\d*)$/);
  if (intensityMatch) {
    vj.setParameter('intensity', parseFloat(intensityMatch[1]));
    return `Set intensity to ${intensityMatch[1]}`;
  }

  const speedMatch = cmd.match(/^speed\s+(\d+\.?\d*)$/);
  if (speedMatch) {
    vj.setParameter('speed', parseFloat(speedMatch[1]));
    return `Set speed to ${speedMatch[1]}`;
  }

  // Not a quick command - let Claude handle it
  return null;
}
