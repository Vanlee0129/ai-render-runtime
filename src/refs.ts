export interface Ref<T> {
  current: T | null;
}

export function ref<T>(initialValue: T | null = null): Ref<T> {
  return { current: initialValue };
}

export type RefCallback<T> = (instance: T | null) => void;

/**
 * useRef - Create a ref that persists across renders
 *
 * Note: If called with no initialValue, useRef<number>() returns { current: null }
 * not { current: undefined }. This matches React behavior.
 */
export function useRef<T = undefined>(): Ref<T> {
  return { current: null as T | null };
}

export function createRef<T>(): Ref<T> {
  return { current: null };
}

/**
 * forwardRef - Forward ref through component
 */
export function forwardRef<P extends Record<string, any>, T>(
  render: (props: P, ref: Ref<T>) => any
): ComponentRef<P, T> {
  return function ForwardedComponent(props: P) {
    // Ref is passed as second argument
    const forwardedRef = (props as any).ref;
    return render(props, forwardedRef);
  } as ComponentRef<P, T>;
}

interface ComponentRef<P extends Record<string, any>, T> {
  (props: P & { ref?: Ref<T> }): any;
  displayName?: string;
}
