import { Spec, createSpec, ViewSpec } from './spec-contract';

export interface Intent {
  type: string;
  confidence: number;
  entities: Record<string, any>;
  raw?: string;
}

export type IntentHandler = (
  intent: Intent,
  context: IntentContext
) => IntentResult | Promise<IntentResult>;

export interface IntentContext {
  state: any;
  history: Intent[];
  user?: any;
}

export interface IntentResult {
  spec: Spec;
  error?: string;
}

export class IntentEngine {
  private handlers: Map<string, IntentHandler> = new Map();
  private defaultHandler: IntentHandler | null = null;

  register(intentType: string, handler: IntentHandler): void {
    this.handlers.set(intentType, handler);
  }

  setDefaultHandler(handler: IntentHandler): void {
    this.defaultHandler = handler;
  }

  async process(intent: Intent, context: IntentContext): Promise<IntentResult> {
    const handler = this.handlers.get(intent.type) || this.defaultHandler;

    if (!handler) {
      return {
        spec: createSpec('error', { type: 'custom', components: [] }),
        error: `No handler for intent type: ${intent.type}`,
      };
    }

    try {
      return await handler(intent, context);
    } catch (e: any) {
      return {
        spec: createSpec('error', { type: 'custom', components: [] }),
        error: e.message,
      };
    }
  }

  getRegisteredIntents(): string[] {
    return Array.from(this.handlers.keys());
  }
}

export const INTENT_TYPES = {
  SHOW: 'show',
  UPDATE: 'update',
  NAVIGATE: 'navigate',
  ACTION: 'action',
  ERROR: 'error',
  UNKNOWN: 'unknown',
} as const;

export const intentEngine = new IntentEngine();
