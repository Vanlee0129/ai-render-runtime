/**
 * componentDidCatch - Wrapper that catches errors in a component
 */
export function componentDidCatch(render, fallback) {
    return function SafeComponent(props) {
        try {
            return render(props);
        }
        catch (error) {
            const errorInfo = {
                componentStack: new Error().stack
            };
            return fallback(error, errorInfo);
        }
    };
}
// ErrorBoundary state storage - keyed by component identity
// In a full implementation, this would be managed by the renderer
const errorBoundaryStateMap = new WeakMap();
/**
 * ErrorBoundary - Component that catches child errors
 *
 * NOTE: This functional component implementation has a limitation - the error state
 * is stored externally and keyed by component identity. For proper React-style
 * state management, this would need hooks (useState) or class-based component.
 *
 * To use multiple independent ErrorBoundaries, ensure each uses a unique
 * component function or use the class-based pattern.
 */
export function ErrorBoundary(props) {
    // Use the ErrorBoundary function reference as the key for state storage
    // This is a simplification - React uses the fiber tree for proper identity
    const componentKey = ErrorBoundary;
    let state = errorBoundaryStateMap.get(componentKey);
    if (!state) {
        state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
        errorBoundaryStateMap.set(componentKey, state);
    }
    const handleError = (error, errorInfo) => {
        state.hasError = true;
        state.error = error;
        state.errorInfo = errorInfo;
        props.onError?.(error, errorInfo);
        return props.fallback(error, errorInfo);
    };
    try {
        if (state.hasError) {
            return props.fallback(state.error, state.errorInfo);
        }
        if (props.children) {
            const children = Array.isArray(props.children) ? props.children : [props.children];
            return children[0] || null;
        }
        return null;
    }
    catch (error) {
        return handleError(error, { componentStack: new Error().stack });
    }
}
/**
 * Reset ErrorBoundary state - useful for testing
 */
export function resetErrorBoundary() {
    errorBoundaryStateMap.delete(ErrorBoundary);
}
//# sourceMappingURL=error-boundary.js.map