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
export function componentDidCatch<
  P extends ComponentProps,
  S extends ErrorBoundaryState
>(
  render: Component<P>,
  fallback: ErrorHandler
): Component<P> {
  return function SafeComponent(props: P): VNode | null {
    try {
      return render(props);
    } catch (error) {
      const errorInfo: ErrorInfo = {
        componentStack: new Error().stack
      };
      return fallback(error as Error, errorInfo);
    }
  };
}

/**
 * ErrorBoundary - Component that catches child errors
 */
export function ErrorBoundary(props: {
  fallback: (error: Error, errorInfo: ErrorInfo) => VNode | null;
  children?: VNode | VNode[];
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}): VNode | null {
  let state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  const handleError = (error: Error, errorInfo: ErrorInfo): VNode | null => {
    state = { hasError: true, error, errorInfo };
    props.onError?.(error, errorInfo);
    return props.fallback(error, errorInfo);
  };

  try {
    if (state.hasError) {
      return props.fallback(state.error!, state.errorInfo!);
    }

    if (props.children) {
      const children = Array.isArray(props.children) ? props.children : [props.children];
      return children[0] || null;
    }
    return null;
  } catch (error) {
    return handleError(error as Error, { componentStack: new Error().stack });
  }
}