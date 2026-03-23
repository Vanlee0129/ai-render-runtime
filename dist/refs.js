export function ref(initialValue = null) {
    return { current: initialValue };
}
/**
 * useRef - Create a ref that persists across renders
 */
export function useRef(initialValue = null) {
    return ref(initialValue);
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