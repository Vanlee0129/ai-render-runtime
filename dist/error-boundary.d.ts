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
 */
export declare function ErrorBoundary(props: {
    fallback: (error: Error, errorInfo: ErrorInfo) => VNode | null;
    children?: VNode | VNode[];
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}): VNode | null;
export {};
//# sourceMappingURL=error-boundary.d.ts.map