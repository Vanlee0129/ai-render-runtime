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
/**
 * ErrorBoundary - Component that catches child errors
 */
export function ErrorBoundary(props) {
    let state = {
        hasError: false,
        error: null,
        errorInfo: null
    };
    const handleError = (error, errorInfo) => {
        state = { hasError: true, error, errorInfo };
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
//# sourceMappingURL=error-boundary.js.map