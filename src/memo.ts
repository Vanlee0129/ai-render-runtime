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
 *
 * Uses a renderId-based cache that's scoped per render cycle.
 * Each render gets its own cache segment via a unique renderId.
 */

// Map of "renderId:depKey" -> { deps, value }
const memoStore = new Map<string, { deps: any[]; value: any }>();

// Current render ID (set by renderer)
let currentRenderId: string | null = null;

export function useMemo<T>(compute: () => T, deps: any[]): T {
  if (!currentRenderId) {
    // No render context - compute without caching
    return compute();
  }

  const key = `${currentRenderId}:${deps.map(d => d ?? 'null').join(',')}`;

  const entry = memoStore.get(key);
  if (entry && depsEqual(entry.deps, deps)) {
    return entry.value as T;
  }

  const value = compute();
  memoStore.set(key, { deps: [...deps], value });
  return value;
}

// Check if deps are equal by value (not reference)
function depsEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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

/**
 * Clear memo cache for a render ID (call at render start)
 */
export function clearMemoCache(renderId: string): void {
  const prefix = `${renderId}:`;
  for (const key of memoStore.keys()) {
    if (key.startsWith(prefix)) {
      memoStore.delete(key);
    }
  }
}

/**
 * Set render ID for memoization tracking (call by renderer)
 */
export function setMemoRenderId(id: string | null): void {
  currentRenderId = id;
}

export function isMemoized(fn: any): boolean {
  return fn && typeof fn === 'function' && 'displayName' in fn && fn.displayName?.startsWith('memo(');
}
