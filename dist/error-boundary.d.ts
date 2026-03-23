import { Component, ComponentProps, VNode } from './vdom';
export interface ErrorInfo {
    componentStack?: string;
}
export interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}
type ErrorHandler = (error: Error, errorInfo: ErrorInfo) => VNode | null;
/**
 * componentDidCatch - Wrapper that catches errors in a component
 */
export declare function componentDidCatch<P extends ComponentProps, S extends ErrorBoundaryState>(render: Component<P>, fallback: ErrorHandler): Component<P>;
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
export declare function ErrorBoundary(props: {
    fallback: (error: Error, errorInfo: ErrorInfo) => VNode | null;
    children?: VNode | VNode[];
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}): VNode | null;
/**
 * Reset ErrorBoundary state - useful for testing
 */
export declare function resetErrorBoundary(): void;
export {};
//# sourceMappingURL=error-boundary.d.ts.map