let memoizedComponentCounter = 0;
/**
 * memo - Memoize a component to prevent unnecessary re-renders
 */
export function memo(Component, compare = shallowCompare) {
    let lastProps = null;
    let lastResult = null;
    let mounted = false;
    const Memoized = (props) => {
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
function shallowCompare(prevProps, nextProps) {
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);
    if (prevKeys.length !== nextKeys.length)
        return false;
    for (const key of prevKeys) {
        if (prevProps[key] !== nextProps[key]) {
            return false;
        }
    }
    return true;
}
/**
 * useMemo - Memoize a computed value
 */
const memoCache = new Map();
export function useMemo(compute, deps) {
    // Simple implementation - in real runtime would integrate with renderer
    const key = deps.join(',');
    if (memoCache.has(key)) {
        return memoCache.get(key);
    }
    const value = compute();
    memoCache.set(key, value);
    return value;
}
/**
 * useCallback - Memoize a callback function
 */
export function useCallback(callback, deps) {
    return useMemo(() => callback, deps);
}
export function isMemoized(fn) {
    return fn && typeof fn === 'function' && 'displayName' in fn && fn.displayName?.startsWith('memo(');
}
//# sourceMappingURL=memo.js.map