export interface Context<T> {
  id: symbol;
  defaultValue: T;
  Provider: ProviderComponent<T>;
  Consumer: ConsumerComponent<T>;
}

type ProviderComponent<T> = (props: { value: T; children?: any }) => any;
type ConsumerComponent<T> = (props: { children: (value: T) => any }) => any;

let contextId = 0;

const CONTEXT_MAP = new Map<symbol, Context<any>>();

export function createContext<T>(defaultValue: T): Context<T> {
  const id = Symbol(`context-${++contextId}`);

  const context: Context<T> = {
    id,
    defaultValue,
    Provider: ({ value, children }: { value: T; children?: any }) => {
      return children;
    },
    Consumer: ({ children }: { children: (value: T) => any }) => {
      return children(defaultValue);
    }
  };

  CONTEXT_MAP.set(id, context);
  return context;
}

// Context stack for nested providers
let contextStack: Array<{ context: Context<any>; value: any }> = [];

export function pushContext<T>(context: Context<T>, value: T): void {
  contextStack.push({ context, value });
}

export function popContext(): void {
  contextStack.pop();
}

export function getContextValue<T>(context: Context<T>): T {
  // Walk stack from top to bottom to find most recent value
  for (let i = contextStack.length - 1; i >= 0; i--) {
    if (contextStack[i].context.id === context.id) {
      return contextStack[i].value as T;
    }
  }
  return context.defaultValue;
}

/**
 * useContext - Hook to consume context value
 */
export function useContext<T>(context: Context<T>): T {
  // In a real implementation, this would subscribe to changes
  // For now, return the current value from stack or default
  for (let i = contextStack.length - 1; i >= 0; i--) {
    if (contextStack[i].context.id === context.id) {
      return contextStack[i].value as T;
    }
  }
  return context.defaultValue;
}
