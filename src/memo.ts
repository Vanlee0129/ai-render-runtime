import { Component, ComponentProps, VNode } from './vdom';

interface MemoizedComponent<P> {
  (props: P): VNode | null;
  displayName: string;
  compare?: (prevProps: P, nextProps: P) => boolean;
}

let memoizedComponentCounter = 0;

/**
 * memo - Memoize a component to prevent unnecessary re-renders
 */
export function memo<P extends ComponentProps>(
  Component: Component<P>,
  compare: (prevProps: P, nextProps: P) => boolean = shallowCompare
): MemoizedComponent<P> {
  let lastProps: P | null = null;
  let lastResult: VNode | null = null;
  let mounted = false;

  const Memoized = (props: P): VNode | null => {
    if (mounted && lastProps !== null && compare(lastProps, props)) {
      return lastResult;
    }
    lastProps = { ...props };
    lastResult = Component(props);
    mounted = true;
    return lastResult;
  };

  Memoized.displayName = `memo(${(Component as any).displayName || 'Component' + ++memoizedComponentCounter})`;
  Memoized.compare = compare;
  return Memoized;
}

function shallowCompare<P>(prevProps: P, nextProps: P): boolean {
  const prevKeys = Object.keys(prevProps as Record<string, unknown>);
  const nextKeys = Object.keys(nextProps as Record<string, unknown>);

  if (prevKeys.length !== nextKeys.length) return false;

  for (const key of prevKeys) {
    if ((prevProps as Record<string, unknown>)[key] !== (nextProps as Record<string, unknown>)[key]) {
      return false;
    }
  }
  return true;
}

/**
 * useMemo - Memoize a computed value
 */
const memoCache = new Map<string, any>();

export function useMemo<T>(compute: () => T, deps: any[]): T {
  // Simple implementation - in real runtime would integrate with renderer
  const key = deps.join(',');

  if (memoCache.has(key)) {
    return memoCache.get(key) as T;
  }

  const value = compute();
  memoCache.set(key, value);
  return value;
}

/**
 * useCallback - Memoize a callback function
 */
export function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T {
  return useMemo(() => callback, deps) as T;
}

export function isMemoized(fn: any): boolean {
  return fn && typeof fn === 'function' && 'displayName' in fn && fn.displayName?.startsWith('memo(');
}