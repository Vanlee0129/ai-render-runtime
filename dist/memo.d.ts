import { Component, ComponentProps, VNode } from './vdom';
interface MemoizedComponent<P> {
    (props: P): VNode | null;
    displayName: string;
    compare?: (prevProps: P, nextProps: P) => boolean;
}
/**
 * memo - Memoize a component to prevent unnecessary re-renders
 */
export declare function memo<P extends ComponentProps>(Component: Component<P>, compare?: (prevProps: P, nextProps: P) => boolean): MemoizedComponent<P>;
export declare function useMemo<T>(compute: () => T, deps: any[]): T;
/**
 * useCallback - Memoize a callback function
 */
export declare function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
/**
 * Clear memo cache for a render ID (call at render start)
 */
export declare function clearMemoCache(renderId: string): void;
/**
 * Set render ID for memoization tracking (call by renderer)
 */
export declare function setMemoRenderId(id: string | null): void;
export declare function isMemoized(fn: any): boolean;
export {};
//# sourceMappingURL=memo.d.ts.map