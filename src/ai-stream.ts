/**
 * AI Render Runtime - AI Streaming & State Management
 * 流式 AI 响应和状态管理
 */

import { VNode, h } from './vdom';
import { registry, ComponentSpec } from './registry';
import { parseAIResponse } from './ai-adapter';

export type AIProvider = 'minimax' | 'openai' | 'anthropic' | 'custom';

export interface AIStreamConfig {
  apiKey: string;
  apiUrl?: string;
  model?: string;
}

/**
 * 流式 AI 状态
 */
export interface AIStreamState {
  isGenerating: boolean;
  progress: number;           // 0-100
  currentSpec: ComponentSpec | null;
  history: ComponentSpec[];   // 历史记录
  error: string | null;
}

/**
 * 流式回调
 */
export type StreamCallback = (state: AIStreamState) => void;

/**
 * Intent 回调 - AI UI 交互触发
 */
export type IntentCallback = (intent: string, payload?: any) => void;

/**
 * AI Stream Manager - 管理流式 AI 响应
 */
export class AIStream {
  private state: AIStreamState;
  private config: AIStreamConfig;
  private provider: AIProvider;
  private onStateChange: StreamCallback | null = null;
  private onIntent: IntentCallback | null = null;

  constructor(config: AIStreamConfig, provider: AIProvider = 'minimax') {
    this.config = config;
    this.provider = provider;
    this.state = {
      isGenerating: false,
      progress: 0,
      currentSpec: null,
      history: [],
      error: null
    };
  }

  /**
   * 设置状态变更回调
   */
  onUpdate(callback: StreamCallback): void {
    this.onStateChange = callback;
  }

  /**
   * 设置 Intent 回调 - UI 交互触发 AI
   */
  onIntentCallback(callback: IntentCallback): void {
    this.onIntent = callback;
  }

  /**
   * 获取当前状态
   */
  getState(): AIStreamState {
    return { ...this.state };
  }

  /**
   * 获取历史记录
   */
  getHistory(): ComponentSpec[] {
    return [...this.state.history];
  }

  /**
   * 触发 Intent - UI 交互
   */
  triggerIntent(intent: string, payload?: any): void {
    this.onIntent?.(intent, payload);
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.state.history = [];
    this.notify();
  }

  /**
   * 流式生成 - 非阻塞
   */
  async *generate(prompt: string): AsyncGenerator<AIStreamState, void, unknown> {
    this.state.isGenerating = true;
    this.state.progress = 0;
    this.state.error = null;
    this.notify();

    try {
      // 模拟流式响应（实际实现需要 WebSocket 或 SSE）
      const response = await this.callAI(prompt);
      const spec = parseAIResponse(response);

      // 分段解析，模拟流式
      const specStr = JSON.stringify(spec);
      const chunks = this.chunkString(specStr, 50);

      for (let i = 0; i < chunks.length; i++) {
        const partialJson = chunks.slice(0, i + 1).join('');
        try {
          const partialSpec = JSON.parse(partialJson);
          this.state.currentSpec = partialSpec;
          this.state.progress = Math.round(((i + 1) / chunks.length) * 100);
          yield this.getState();
        } catch {
          // JSON 不完整，继续
        }
      }

      // 最终状态
      this.state.currentSpec = spec;
      this.state.history.push(spec);
      this.state.progress = 100;
      yield this.getState();

    } catch (e: any) {
      this.state.error = e.message;
      yield this.getState();
    } finally {
      this.state.isGenerating = false;
      this.notify();
    }
  }

  /**
   * 传统非流式生成
   */
  async generateOnce(prompt: string): Promise<ComponentSpec | null> {
    this.state.isGenerating = true;
    this.state.progress = 0;
    this.state.error = null;
    this.notify();

    try {
      const response = await this.callAI(prompt);
      const spec = parseAIResponse(response);
      this.state.currentSpec = spec;
      this.state.history.push(spec);
      this.state.progress = 100;
      this.notify();
      return spec;
    } catch (e: any) {
      this.state.error = e.message;
      this.notify();
      return null;
    } finally {
      this.state.isGenerating = false;
      this.notify();
    }
  }

  private notify(): void {
    this.onStateChange?.(this.getState());
  }

  private async callAI(prompt: string): Promise<string> {
    const { apiKey, apiUrl = 'https://api.minimaxi.com/v1/text/chatcompletion_v2', model = 'M2-her' } = this.config;

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是专业的 AI UI 设计师，只返回 JSON，不要其他文字。' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await res.json();

    if (data.base_resp?.status_code !== 0) {
      throw new Error(data.base_resp?.status_msg || 'API 请求失败');
    }

    return data.choices?.[0]?.message?.content || '';
  }

  private chunkString(str: string, size: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Intent Router - 处理 AI UI 交互
 */
export class IntentRouter {
  private handlers: Map<string, (payload?: any) => string | Promise<string>> = new Map();

  /**
   * 注册 Intent 处理器
   */
  register(intent: string, handler: (payload?: any) => string | Promise<string>): void {
    this.handlers.set(intent, handler);
  }

  /**
   * 处理 Intent
   */
  async handle(intent: string, payload?: any): Promise<string | null> {
    const handler = this.handlers.get(intent);
    if (!handler) return null;
    return handler(payload);
  }

  /**
   * 获取已注册的 Intents
   */
  getIntents(): string[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * 便捷函数：创建 AI Stream
 */
export function createAIStream(config: AIStreamConfig, provider: AIProvider = 'minimax'): AIStream {
  return new AIStream(config, provider);
}

/**
 * 便捷函数：创建 Intent Router
 */
export function createIntentRouter(): IntentRouter {
  return new IntentRouter();
}
