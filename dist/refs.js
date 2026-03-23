export function ref(initialValue = null) {
    return { current: initialValue };
}
/**
 * useRef - Create a ref that persists across renders
 *
 * Note: If called with no initialValue, useRef<number>() returns { current: null }
 * not { current: undefined }. This matches React behavior.
 */
export function useRef() {
    return { current: null };
}
export function createRef() {
    return { current: null };
}
/**
 * forwardRef - Forward ref through component
 */
export function forwardRef(render) {
    return function ForwardedComponent(props) {
        // Ref is passed as second argument
        const forwardedRef = props.ref;
        return render(props, forwardedRef);
    };
}
//# sourceMappingURL=refs.js.map