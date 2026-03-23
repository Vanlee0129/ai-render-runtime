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
// Context stack for nested providers
let contextStack = [];
export function pushContext(context, value) {
    contextStack.push({ context, value });
}
export function popContext() {
    contextStack.pop();
}
export function getContextValue(context) {
    // Walk stack from top to bottom to find most recent value
    for (let i = contextStack.length - 1; i >= 0; i--) {
        if (contextStack[i].context.id === context.id) {
            return contextStack[i].value;
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
    for (let i = contextStack.length - 1; i >= 0; i--) {
        if (contextStack[i].context.id === context.id) {
            return contextStack[i].value;
        }
    }
    return context.defaultValue;
}
//# sourceMappingURL=context.js.map