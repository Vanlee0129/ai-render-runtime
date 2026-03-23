/**
 * Reactive System - Vue 3 style Proxy-based reactivity
 */

type Target = object;
type Key = string | symbol;

let activeEffect: (() => void) | null = null;
let shouldTrack = false;

const targetMap = new WeakMap<Target, Map<Key, Set<() => void>>>();
const refMap = new WeakMap<object, { value: any }>();

// Track deps per effect for cleanup
const effectDepsMap = new Map<() => void, Set<Set<() => void>>>();

function getDep(target: Target, key: Key): Set<() => void> {
  if (!targetMap.has(target)) {
    targetMap.set(target, new Map());
  }
  const deps = targetMap.get(target)!.get(key);
  if (!deps) {
    const newDeps = new Set<() => void>();
    targetMap.get(target)!.set(key, newDeps);
    return newDeps;
  }
  return deps;
}

export function track(target: Target, key: Key): void {
  if (!shouldTrack || !activeEffect) return;

  const deps = getDep(target, key);
  deps.add(activeEffect);

  // Track this dep for cleanup
  if (!effectDepsMap.has(activeEffect)) {
    effectDepsMap.set(activeEffect, new Set());
  }
  effectDepsMap.get(activeEffect)!.add(deps);
}

export function trigger(target: Target, key?: Key): void {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  if (key) {
    const deps = depsMap.get(key);
    if (deps) {
      deps.forEach(effect => effect());
    }
  } else {
    // Trigger all
    depsMap.forEach(deps => {
      deps.forEach(effect => effect());
    });
  }
}

export function reactive<T extends object>(target: T): T {
  return new Proxy(target, {
    get(obj, key, receiver) {
      const value = Reflect.get(obj, key, receiver);
      track(obj, key as Key);

      if (value !== null && typeof value === 'object') {
        return reactive(value);
      }
      return value;
    },

    set(obj, key, value, receiver) {
      const oldValue = Reflect.get(obj, key, receiver);
      const result = Reflect.set(obj, key, value, receiver);

      if (oldValue !== value) {
        trigger(obj, key as Key);
      }
      return result;
    },

    deleteProperty(obj, key) {
      const hadKey = Reflect.has(obj, key);
      const result = Reflect.deleteProperty(obj, key);

      if (hadKey && result) {
        trigger(obj, key as Key);
      }
      return result;
    }
  });
}

export function ref<T>(initialValue: T): { value: T } {
  // If already a ref, return it
  if (typeof initialValue === 'object' && initialValue !== null && 'value' in initialValue) {
    return initialValue as { value: T };
  }

  const wrapper = {
    get value() {
      shouldTrack = true;
      track(wrapper as any, 'value');
      shouldTrack = false;
      return initialValue;
    },
    set value(newVal: T) {
      if (newVal !== initialValue) {
        initialValue = newVal;
        trigger(wrapper as any, 'value');
      }
    }
  };

  refMap.set(wrapper, { value: initialValue });
  return wrapper;
}

export function isRef(obj: any): boolean {
  return refMap.has(obj);
}

export function computed<T>(fn: () => T): { value: T } {
  let computedValue: T;
  let hasValue = false;

  const effect = () => {
    shouldTrack = true;
    activeEffect = effect;
    try {
      computedValue = fn();
      hasValue = true;
    } finally {
      activeEffect = null;
      shouldTrack = false;
    }
  };

  // Run immediately to get initial value
  effect();

  return {
    get value() {
      if (!hasValue) {
        computedValue = fn();
        hasValue = true;
      }
      return computedValue;
    }
  };
}

export function watchEffect(fn: () => void): () => void {
  const effect = () => {
    shouldTrack = true;
    activeEffect = effect;
    try {
      fn();
    } finally {
      activeEffect = null;
      shouldTrack = false;
    }
  };

  effect();

  return () => {
    // Cleanup - remove from tracked deps only
    const deps = effectDepsMap.get(effect);
    if (deps) {
      deps.forEach(dep => {
        dep.delete(effect);
      });
      effectDepsMap.delete(effect);
    }
  };
}

/**
 * watchProxy - Watch using Proxy-based reactivity
 * Use this when watching reactive() objects
 */
export function watchProxy<T>(
  source: () => T,
  callback: (newValue: T, oldValue: T) => void,
  options?: { immediate?: boolean }
): () => void {
  let oldValue: T | undefined;
  let isFirstRun = true;

  const effect = () => {
    const newValue = source();

    if (!isFirstRun && newValue !== oldValue) {
      const prev = oldValue;
      oldValue = newValue;
      callback(newValue, prev as T);
    } else {
      oldValue = newValue;
      if (options?.immediate && isFirstRun) {
        callback(newValue, undefined as any);
      }
      isFirstRun = false;
    }
  };

  watchEffect(effect);

  return () => {
    // Return a stop function
  };
}
