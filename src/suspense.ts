/**
 * Suspense - 异步组件加载状态管理
 */

import { VNode, Component, ComponentProps } from './vdom';

export interface SuspenseState {
  isPending: boolean;
  error: Error | null;
  fallback: VNode | null;
}

const suspenseStates = new WeakMap<Element, SuspenseState>();

export function getSuspenseState(el: Element): SuspenseState | undefined {
  return suspenseStates.get(el);
}

/**
 * Define an async component that loads dynamically
 */
export function defineAsyncComponent(
  loader: () => Promise<{ default: Component }>
): Component {
  let loaded = false;
  let loading = false;
  let error: Error | null = null;
  let component: Component | null = null;
  let loadPromise: Promise<any> | null = null;

  return function AsyncComponent(props: ComponentProps): VNode | null {
    if (loaded && component) {
      return component(props);
    }

    if (error) {
      throw error;
    }

    if (!loading) {
      loading = true;
      loadPromise = loader()
        .then(module => {
          component = module.default;
          loaded = true;
          loading = false;
        })
        .catch(err => {
          error = err;
          loading = false;
          throw err;
        });
    }

    // Throw promise to signal Suspense boundary
    if (loadPromise) {
      throw loadPromise;
    }

    return null;
  };
}

/**
 * Check if a component is marked as async
 */
export function isAsyncComponent(component: any): boolean {
  return component?._isAsync === true;
}

/**
 * Mark a component as async
 */
export function markAsyncComponent(component: Component): void {
  (component as any)._isAsync = true;
}