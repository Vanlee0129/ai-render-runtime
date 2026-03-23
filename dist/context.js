let contextId = 0;
const CONTEXT_MAP = new Map();
export function createContext(defaultValue) {
    const id = Symbol(`context-${++contextId}`);
    const context = {
        id,
        defaultValue,
        Provider: ({ value, children }) => {
            return children;
        },
        Consumer: ({ children }) => {
            return children(defaultValue);
        }
    };
    CONTEXT_MAP.set(id, context);
    return context;
}
// Context stack for nested providers - keyed by renderer instance
// This enables multiple renderer instances to have independent context stacks
const contextStacks = new WeakMap();
// Current renderer context (set by renderer when creating vnodes)
let currentRenderer = null;
export function setCurrentRenderer(renderer) {
    currentRenderer = renderer;
}
function getContextStack() {
    if (!currentRenderer) {
        // Fallback to module-level stack for non-renderer usage
        if (!globalThis.__airRenderContextStack) {
            globalThis.__airRenderContextStack = [];
        }
        return globalThis.__airRenderContextStack;
    }
    if (!contextStacks.has(currentRenderer)) {
        contextStacks.set(currentRenderer, []);
    }
    return contextStacks.get(currentRenderer);
}
export function pushContext(context, value) {
    getContextStack().push({ context, value });
}
export function popContext() {
    getContextStack().pop();
}
export function getContextValue(context) {
    // Walk stack from top to bottom to find most recent value
    const stack = getContextStack();
    for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].context.id === context.id) {
            return stack[i].value;
        }
    }
    return context.defaultValue;
}
/**
 * useContext - Hook to consume context value
 */
export function useContext(context) {
    // In a real implementation, this would subscribe to changes
    // For now, return the current value from stack or default
    const stack = getContextStack();
    for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].context.id === context.id) {
            return stack[i].value;
        }
    }
    return context.defaultValue;
}
export function createInjectionKey(defaultValue) {
    return {
        _id: Symbol(),
        _default: defaultValue
    };
}
/**
 * provide - Register a value for injection by descendants
 */
export function provide(key, value) {
    // Get or create context for this key
    let context;
    if (typeof key === 'string') {
        // String key - create a context with it
        context = createContext(value);
    }
    else {
        // InjectionKey - use its id
        context = key._context || createContext(key._default);
        key._context = context;
    }
    // Override the context's value by pushing to stack
    pushContext(context, value);
}
/**
 * inject - Retrieve a value provided by an ancestor
 */
export function inject(key, defaultValue) {
    let context;
    if (typeof key === 'string') {
        // String key
        context = createContext(defaultValue);
    }
    else {
        // InjectionKey
        context = key._context || createContext(key._default);
    }
    // Get value from context stack
    const stack = getContextStack();
    for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].context.id === context.id) {
            return stack[i].value;
        }
    }
    return defaultValue;
}
//# sourceMappingURL=context.js.map