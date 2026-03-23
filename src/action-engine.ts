import { ActionSpec, ActionType } from './spec-contract';

type ActionHandler = (payload: any) => Promise<ActionResult> | ActionResult;

interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  nextIntent?: string;
}

export class ActionEngine {
  private handlers: Map<string, ActionHandler> = new Map();

  register(actionType: ActionType, handler: ActionHandler): void;
  register(actionId: string, handler: ActionHandler): void;
  register(actionIdOrType: string, handler: ActionHandler): void {
    this.handlers.set(actionIdOrType, handler);
  }

  async execute(action: ActionSpec): Promise<ActionResult> {
    const handler = this.handlers.get(action.id) || this.handlers.get(action.type);

    if (!handler) {
      return {
        success: false,
        error: `No handler for action: ${action.id || action.type}`,
      };
    }

    try {
      const result = await handler(action.payload);
      return {
        success: true,
        data: result,
        nextIntent: action.nextIntent,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message,
      };
    }
  }

  async executeBatch(actions: ActionSpec[]): Promise<ActionResult[]> {
    return Promise.all(actions.map(action => this.execute(action)));
  }
}

export const actionEngine = new ActionEngine();
