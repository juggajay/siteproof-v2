import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | any[];
}

export interface ClaudeResponse {
  content: any[];
  stop_reason: string;
  stop_sequence?: string | null;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Call Claude API with messages and optional tools
 */
export async function callClaude(params: {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  system?: string;
  messages: ClaudeMessage[];
  tools?: any[];
}): Promise<ClaudeResponse> {
  const {
    model = 'claude-3-5-sonnet-20241022',
    max_tokens = 4000,
    temperature = 0.3,
    system,
    messages,
    tools,
  } = params;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens,
      temperature,
      system,
      messages,
      tools,
    } as any);

    return response as ClaudeResponse;
  } catch (error) {
    console.error('[Claude Service] API call failed:', error);
    throw error;
  }
}

/**
 * Extract tool use from Claude's response
 */
export function extractToolUse(response: ClaudeResponse): {
  id: string;
  name: string;
  input: any;
} | null {
  for (const content of response.content) {
    if (content.type === 'tool_use') {
      return {
        id: content.id,
        name: content.name,
        input: content.input,
      };
    }
  }
  return null;
}

/**
 * Extract text response from Claude's response
 */
export function extractTextResponse(response: ClaudeResponse): string {
  const textParts: string[] = [];

  for (const content of response.content) {
    if (content.type === 'text') {
      textParts.push(content.text);
    }
  }

  return textParts.join('\n');
}

/**
 * Format tool result for Claude
 */
export function formatToolResult(toolUseId: string, result: any): any {
  return {
    type: 'tool_result',
    tool_use_id: toolUseId,
    content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
  };
}
