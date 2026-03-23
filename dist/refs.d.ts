export interface Ref<T> {
    current: T | null;
}
export declare function ref<T>(initialValue?: T | null): Ref<T>;
export type RefCallback<T> = (instance: T | null) => void;
/**
 * useRef - Create a ref that persists across renders
 *
 * Note: If called with no initialValue, useRef<number>() returns { current: null }
 * not { current: undefined }. This matches React behavior.
 */
export declare function useRef<T = undefined>(): Ref<T>;
export declare function createRef<T>(): Ref<T>;
/**
 * forwardRef - Forward ref through component
 */
export declare function forwardRef<P extends Record<string, any>, T>(render: (props: P, ref: Ref<T>) => any): ComponentRef<P, T>;
interface ComponentRef<P extends Record<string, any>, T> {
    (props: P & {
        ref?: Ref<T>;
    }): any;
    displayName?: string;
}
export {};
//# sourceMappingURL=refs.d.ts.map