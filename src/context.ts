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

// Context stack for nested providers - keyed by renderer instance
// This enables multiple renderer instances to have independent context stacks
const contextStacks = new WeakMap<object, Array<{ context: Context<any>; value: any }>>();

// Current renderer context (set by renderer when creating vnodes)
let currentRenderer: object | null = null;

export function setCurrentRenderer(renderer: object | null): void {
  currentRenderer = renderer;
}

function getContextStack(): Array<{ context: Context<any>; value: any }> {
  if (!currentRenderer) {
    // Fallback to module-level stack for non-renderer usage
    if (!(globalThis as any).__airRenderContextStack) {
      (globalThis as any).__airRenderContextStack = [];
    }
    return (globalThis as any).__airRenderContextStack;
  }
  if (!contextStacks.has(currentRenderer)) {
    contextStacks.set(currentRenderer, []);
  }
  return contextStacks.get(currentRenderer)!;
}

export function pushContext<T>(context: Context<T>, value: T): void {
  getContextStack().push({ context, value });
}

export function popContext(): void {
  getContextStack().pop();
}

export function getContextValue<T>(context: Context<T>): T {
  // Walk stack from top to bottom to find most recent value
  const stack = getContextStack();
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].context.id === context.id) {
      return stack[i].value as T;
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
  const stack = getContextStack();
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].context.id === context.id) {
      return stack[i].value as T;
    }
  }
  return context.defaultValue;
}

// InjectionKey for typed provide/inject
export interface InjectionKey<T> {
  _id: symbol;
  _default: T;
}

export function createInjectionKey<T>(defaultValue: T): InjectionKey<T> {
  return {
    _id: Symbol(),
    _default: defaultValue
  };
}

/**
 * provide - Register a value for injection by descendants
 */
export function provide<T>(key: string | InjectionKey<T>, value: T): void {
  // Get or create context for this key
  let context: Context<T>;

  if (typeof key === 'string') {
    // String key - create a context with it
    context = createContext(value);
  } else {
    // InjectionKey - use its id
    context = (key as any)._context || createContext((key as InjectionKey<T>)._default);
    (key as any)._context = context;
  }

  // Override the context's value by pushing to stack
  pushContext(context, value);
}

/**
 * inject - Retrieve a value provided by an ancestor
 */
export function inject<T>(key: string | InjectionKey<T>, defaultValue?: T): T | undefined {
  let context: Context<T>;

  if (typeof key === 'string') {
    // String key
    context = createContext(defaultValue as T);
  } else {
    // InjectionKey
    context = (key as any)._context || createContext((key as InjectionKey<T>)._default);
  }

  // Get value from context stack
  const stack = getContextStack();
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].context.id === context.id) {
      return stack[i].value as T;
    }
  }

  return defaultValue;
}
