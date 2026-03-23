/**
 * AI Render Runtime - AI Adapter
 * AI API 适配器，支持多种后端
 */
import { AIConfig, AIResponse } from './prompts';
export type AIProvider = 'minimax' | 'openai' | 'anthropic' | 'custom';
export declare function callAI(provider: AIProvider, config: AIConfig, userPrompt: string): Promise<AIResponse>;
export declare function parseAIResponse(content: string): any;
//# sourceMappingURL=ai-adapter.d.ts.map