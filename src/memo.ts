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

  Memoized.displayName = `memo(${Component.displayName || 'Component' + ++memoizedComponentCounter})`;
  Memoized.compare = compare;
  return Memoized;
}

function shallowCompare<P>(prevProps: P, nextProps: P): boolean {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) return false;

  for (const key of prevKeys) {
    if (prevProps[key as keyof P] !== nextProps[key as keyof P]) {
      return false;
    }
  }
  return true;
}

/**
 * useMemo - Memoize a computed value
 */
export function useMemo<T>(compute: () => T, deps: any[]): T {
  // Simple implementation - in real runtime would integrate with renderer
  const key = deps.join(',');
  const cache = useMemo.cache || (useMemo.cache = new Map());

  if (cache.has(key)) {
    return cache.get(key) as T;
  }

  const value = compute();
  cache.set(key, value);
  return value;
}

namespace useMemo {
  export let cache: Map<string, any> | undefined;
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