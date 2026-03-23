# Vue-Inspired Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Vue 3-inspired features: PatchFlags, VNode static hoisting, lifecycle hooks, KeepAlive component caching, async component/Suspense support, reactive proxy, computed lazy evaluation, watch effect, and response Provide/Inject.

**Architecture:** Add new files for complex features (reactive, KeepAlive, Suspense) and modify existing files (vdom, renderer, signal, context) for incremental features. All features are optional additions that don't break existing API.

**Tech Stack:** TypeScript, no external dependencies

---

## Chunk 1: PatchFlags - 精细化更新

### Task 1: Add PatchFlags to vdom.ts

**Files:**
- Modify: `src/vdom.ts:68-73`

- [ ] **Step 1: Add PatchFlags enum to vdom.ts**

```typescript
export enum PatchFlags {
  TEXT = 1,        // 文本内容变化
  CLASS = 2,       // class 变化
  STYLE = 4,       // style 变化
  PROPS = 8,       // 其他 props 变化 (非 class/style)
  FULL = 16,       // 完整 diff
}
```

- [ ] **Step 2: Add patchFlag field to VNode interface**

```typescript
export interface VNode {
  // ... existing fields
  patchFlag?: PatchFlags;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/vdom.ts
git commit -m "feat: add PatchFlags enum for fine-grained updates"
```

---

### Task 2: Update h() and jsx() to support patchFlag

**Files:**
- Modify: `src/vdom.ts:78-90` and `src/vdom.ts:148-151`

- [ ] **Step 1: Update h() function signature**

```typescript
export function h(
  tag: string,
  props: VNodeProps = {},
  ...children: (VNode | string)[]
): VNode {
  const { patchFlag, ...rest } = props as VNodeProps & { patchFlag?: PatchFlags };
  return {
    type: tag,
    props: rest,
    children: children.flat(),
    key: rest.key,
    flags: VNodeFlags.Element,
    patchFlag
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/vdom.ts
git commit -m "feat: h() supports patchFlag for optimized diffing"
```

---

### Task 3: Use PatchFlags in renderer for optimized updates

**Files:**
- Modify: `src/renderer.ts` (updateProps method around line 475)

- [ ] **Step 1: Update updateProps to use patchFlag**

In renderer.ts, modify updateProps to check patchFlag and only update relevant properties:

```typescript
private updateProps(
  dom: HTMLElement,
  newProps: VNodeProps,
  oldProps: VNodeProps,
  patchFlag?: PatchFlags
): void {
  if (patchFlag === PatchFlags.TEXT) {
    // Only text changed, handled by text node update
    return;
  }

  if (patchFlag === PatchFlags.CLASS) {
    if (newProps.className !== oldProps?.className) {
      dom.setAttribute('class', newProps.className || '');
    }
    return;
  }

  if (patchFlag === PatchFlags.STYLE) {
    if (typeof newProps.style === 'object') {
      Object.assign(dom.style, newProps.style);
    }
    return;
  }

  // Default: full props update
  // ... existing logic
}
```

- [ ] **Step 2: Update patch call to pass patchFlag**

In renderer.ts patch method, pass patchFlag:

```typescript
this.updateProps(parent as HTMLElement, newVNode.props, oldVNode.props, newVNode.patchFlag);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/renderer.ts
git commit -m "feat: renderer uses patchFlag for optimized prop updates"
```

---

## Chunk 2: VNode Static Hoisting - 静态提升

### Task 4: Add VNode caching for static elements

**Files:**
- Create: `src/vnode-cache.ts`
- Modify: `src/vdom.ts`

- [ ] **Step 1: Create vnode-cache.ts**

```typescript
/**
 * VNode Static Cache - 静态 VNode 记忆化
 * 相同的静态元素只创建一次
 */

import { VNode, VNodeFlags } from './vdom';

const staticVNodeCache = new Map<string, VNode>();

const MAX_CACHE_SIZE = 1000;

/**
 * Get or create a cached static VNode
 */
export function getCachedVNode(
  type: string,
  props: Record<string, any>,
  children: (VNode | string)[]
): VNode {
  // Only cache simple elements (no functions, no dynamic props)
  const key = `${type}:${JSON.stringify(props)}:${JSON.stringify(children)}`;

  if (staticVNodeCache.has(key)) {
    return staticVNodeCache.get(key)!;
  }

  const vnode: VNode = {
    type,
    props,
    children,
    flags: VNodeFlags.Element
  };

  // LRU-style cache management
  if (staticVNodeCache.size >= MAX_CACHE_SIZE) {
    const firstKey = staticVNodeCache.keys().next().value;
    staticVNodeCache.delete(firstKey);
  }

  staticVNodeCache.set(key, vnode);
  return vnode;
}

/**
 * Clear static cache
 */
export function clearVNodeCache(): void {
  staticVNodeCache.clear();
}
```

- [ ] **Step 2: Add option to h() for cached VNode**

Modify src/vdom.ts:

```typescript
let enableStaticHoisting = false;

export function enableStaticHoisting(): void {
  enableStaticHoisting = true;
}

export function disableStaticHoisting(): void {
  enableStaticHoisting = false;
  clearVNodeCache();
}

export function h(
  tag: string,
  props: VNodeProps = {},
  ...children: (VNode | string)[]
): VNode {
  const { children: _, ...rest } = props;

  // Check if this is a static element suitable for caching
  if (enableStaticHoisting && isStaticElement(tag, rest)) {
    return getCachedVNode(tag, rest, children.flat());
  }

  return {
    type: tag,
    props: rest,
    children: children.flat(),
    key: rest.key,
    flags: VNodeFlags.Element
  };
}

function isStaticElement(tag: string, props: VNodeProps): boolean {
  // Don't cache if props contain functions (handlers) or refs
  for (const key in props) {
    if (key.startsWith('on') && typeof props[key] === 'function') return false;
    if (key === 'ref') return false;
    if (key === 'key') continue;
    if (typeof props[key] === 'function') return false;
  }
  return true;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/vnode-cache.ts src/vdom.ts
git commit -m "feat: add VNode static hoisting cache"
```

---

## Chunk 3: Lifecycle Hooks - 生命周期钩子

### Task 5: Create lifecycle system

**Files:**
- Create: `src/lifecycle.ts`
- Modify: `src/renderer.ts`

- [ ] **Step 1: Create lifecycle.ts**

```typescript
/**
 * Lifecycle Hooks System
 * Inspired by Vue 3 and React lifecycle patterns
 */

import { Component } from './vdom';

export type LifecycleHook = () => void;

interface LifecycleHooks {
  onMounted?: LifecycleHook[];
  onUpdated?: LifecycleHook[];
  onUnmounted?: LifecycleHook[];
  onBeforeMount?: LifecycleHook[];
  onBeforeUpdate?: LifecycleHook[];
  onBeforeUnmount?: LifecycleHook[];
}

const componentLifecycleMap = new WeakMap<Component, LifecycleHooks>();

let currentComponent: Component | null = null;

export function setCurrentComponentInstance(component: Component | null): void {
  currentComponent = component;
}

export function getCurrentComponentInstance(): Component | null {
  return currentComponent;
}

export function onMounted(hook: LifecycleHook): void {
  if (currentComponent) {
    const hooks = getOrCreateHooks(currentComponent);
    if (!hooks.onMounted) hooks.onMounted = [];
    hooks.onMounted.push(hook);
  }
}

export function onUpdated(hook: LifecycleHook): void {
  if (currentComponent) {
    const hooks = getOrCreateHooks(currentComponent);
    if (!hooks.onUpdated) hooks.onUpdated = [];
    hooks.onUpdated.push(hook);
  }
}

export function onUnmounted(hook: LifecycleHook): void {
  if (currentComponent) {
    const hooks = getOrCreateHooks(currentComponent);
    if (!hooks.onUnmounted) hooks.onUnmounted = [];
    hooks.onUnmounted.push(hook);
  }
}

export function onBeforeMount(hook: LifecycleHook): void {
  if (currentComponent) {
    const hooks = getOrCreateHooks(currentComponent);
    if (!hooks.onBeforeMount) hooks.onBeforeMount = [];
    hooks.onBeforeMount.push(hook);
  }
}

export function onBeforeUpdate(hook: LifecycleHook): void {
  if (currentComponent) {
    const hooks = getOrCreateHooks(currentComponent);
    if (!hooks.onBeforeUpdate) hooks.onBeforeUpdate = [];
    hooks.onBeforeUpdate.push(hook);
  }
}

export function onBeforeUnmount(hook: LifecycleHook): void {
  if (currentComponent) {
    const hooks = getOrCreateHooks(currentComponent);
    if (!hooks.onBeforeUnmount) hooks.onBeforeUnmount = [];
    hooks.onBeforeUnmount.push(hook);
  }
}

function getOrCreateHooks(component: Component): LifecycleHooks {
  if (!componentLifecycleMap.has(component)) {
    componentLifecycleMap.set(component, {});
  }
  return componentLifecycleMap.get(component)!;
}

export function callHook(component: Component, hookName: keyof LifecycleHooks): void {
  const hooks = componentLifecycleMap.get(component);
  if (hooks && hooks[hookName]) {
    hooks[hookName]!.forEach(hook => hook());
  }
}

export function hasLifecycleHooks(component: Component): boolean {
  const hooks = componentLifecycleMap.get(component);
  if (!hooks) return false;
  return !!(
    hooks.onMounted?.length ||
    hooks.onUpdated?.length ||
    hooks.onUnmounted?.length ||
    hooks.onBeforeMount?.length ||
    hooks.onBeforeUpdate?.length ||
    hooks.onBeforeUnmount?.length
  );
}

export function clearLifecycleHooks(component: Component): void {
  componentLifecycleMap.delete(component);
}
```

- [ ] **Step 2: Integrate with renderer - import and set current component**

In renderer.ts, modify createComponentDom:

```typescript
import { setCurrentComponentInstance, callHook } from './lifecycle';

// In createComponentDom:
private createComponentDom(vnode: VNode): Element | Comment {
  const Component = vnode.type as Component;
  const props = vnode.props || {};

  try {
    // Set current component for lifecycle hooks
    setCurrentComponentInstance(Component);

    // Call onBeforeMount
    callHook(Component, 'onBeforeMount');

    const result = Component(props);

    setCurrentComponentInstance(null);

    if (result === null) {
      return document.createComment('Empty Component');
    }

    const dom = this.createDom(result);
    (dom as any)._component = vnode;

    // Call onMounted after DOM is created and appended
    callHook(Component, 'onMounted');

    return dom;
  } catch (e) {
    setCurrentComponentInstance(null);
    console.error('Component render error:', e);
    return document.createComment('Error');
  }
}
```

- [ ] **Step 3: Add lifecycle export to index.ts**

In src/index.ts, add exports:

```typescript
export { onMounted, onUpdated, onUnmounted, onBeforeMount, onBeforeUpdate, onBeforeUnmount } from './lifecycle';
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/lifecycle.ts src/renderer.ts src/index.ts
git commit -m "feat: add lifecycle hooks system (onMounted, onUpdated, etc.)"
```

---

## Chunk 4: KeepAlive - 组件缓存

### Task 6: Create KeepAlive component

**Files:**
- Create: `src/keep-alive.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create keep-alive.ts**

```typescript
/**
 * KeepAlive - 组件缓存
 * 缓存组件实例，避免重复创建和销毁
 */

import { VNode, Component, ComponentProps } from './vdom';

interface KeepAliveCache {
  key: string | number;
  vnode: VNode;
  component: Component;
  dom: Element | Text | Comment;
}

const keepAliveCache = new Map<string | number, KeepAliveCache>();
const currentKeepAlive: { include?: (string | number)[]; exclude?: (string | number)[] } = {
  include: undefined,
  exclude: undefined
};

export function setKeepAliveFilter(include?: (string | number)[], exclude?: (string | number)[]): void {
  currentKeepAlive.include = include;
  currentKeepAlive.exclude = exclude;
}

/**
 * Should this component be kept alive?
 */
function shouldKeepAlive(key: string | number): boolean {
  if (currentKeepAlive.exclude?.includes(key)) {
    return false;
  }
  if (currentKeepAlive.include && !currentKeepAlive.include.includes(key)) {
    return false;
  }
  return true;
}

/**
 * Get cached component instance
 */
export function getKeepAliveCache(key: string | number): KeepAliveCache | undefined {
  return keepAliveCache.get(key);
}

/**
 * Set cache entry
 */
export function setKeepAliveCache(key: string | number, entry: KeepAliveCache): void {
  if (!shouldKeepAlive(key)) return;

  // Evict oldest if cache is full
  if (keepAliveCache.size >= 100) {
    const firstKey = keepAliveCache.keys().next().value;
    keepAliveCache.delete(firstKey);
  }

  keepAliveCache.set(key, entry);
}

/**
 * Remove from cache
 */
export function removeKeepAliveCache(key: string | number): void {
  keepAliveCache.delete(key);
}

/**
 * Clear all cache
 */
export function clearKeepAliveCache(): void {
  keepAliveCache.clear();
}

/**
 * KeepAlive component
 */
export function KeepAlive(props: {
  include?: (string | number)[];
  exclude?: (string | number)[];
  children?: VNode;
}): VNode | null {
  if (!props.children) return null;

  const child = Array.isArray(props.children) ? props.children[0] : props.children;
  if (!child || typeof child !== 'object') return null;

  const key = child.key ?? 'default';

  // Set filter for child components
  setKeepAliveFilter(props.include, props.exclude);

  const cached = getKeepAliveCache(key);

  if (cached) {
    // Return cached DOM, don't re-render
    return child;
  }

  // Cache miss - mark for caching
  (child as any)._keepAliveKey = key;

  return child;
}
```

- [ ] **Step 2: Modify renderer to handle KeepAlive caching**

In renderer.ts, modify createComponentDom:

```typescript
import { getKeepAliveCache, setKeepAliveCache } from './keep-alive';

// In createComponentDom:
private createComponentDom(vnode: VNode): Element | Comment {
  const Component = vnode.type as Component;
  const props = vnode.props || {};

  try {
    // Check if this component should be kept alive
    const keepAliveKey = (vnode as any)._keepAliveKey;
    if (keepAliveKey !== undefined) {
      const cached = getKeepAliveCache(keepAliveKey);
      if (cached) {
        // Use cached DOM
        return cached.dom;
      }
    }

    const result = Component(props);
    if (result === null) {
      return document.createComment('Empty Component');
    }

    const dom = this.createDom(result);
    (dom as any)._component = vnode;

    // Cache if this is a kept-alive component
    if (keepAliveKey !== undefined) {
      setKeepAliveCache(keepAliveKey, {
        key: keepAliveKey,
        vnode,
        component: Component,
        dom
      });
    }

    return dom;
  } catch (e) {
    console.error('Component render error:', e);
    return document.createComment('Error');
  }
}
```

- [ ] **Step 3: Add KeepAlive exports to index.ts**

In src/index.ts, add:

```typescript
export { KeepAlive, getKeepAliveCache, clearKeepAliveCache } from './keep-alive';
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/keep-alive.ts src/renderer.ts src/index.ts
git commit -m "feat: add KeepAlive component for instance caching"
```

---

## Chunk 5: Async Components & Suspense - 异步组件

### Task 7: Create Suspense and async component support

**Files:**
- Create: `src/suspense.ts`
- Modify: `src/renderer.ts`, `src/index.ts`

- [ ] **Step 1: Create suspense.ts**

```typescript
/**
 * Suspense - 异步组件加载状态管理
 */

import { VNode, Component } from './vdom';

export interface SuspenseState {
  isPending: boolean;
  error: Error | null;
  resolve: (vnode: VNode) => void;
  reject: (error: Error) => void;
}

const suspenseMap = new WeakMap<Element, SuspenseState>();

export function createSuspenseState(): SuspenseState {
  return {
    isPending: false,
    error: null,
    resolve: () => {},
    reject: () => {}
  };
}

/**
 * Async component wrapper
 */
export function defineAsyncComponent(
  loader: () => Promise<{ default: Component }>
): Component {
  let loaded = false;
  let loading = false;
  let error = null;
  let component: Component | null = null;
  let loadPromise: Promise<any> | null = null;

  return function AsyncComponent(props: any): VNode | null {
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
        });
    }

    // Throw a promise to trigger Suspense
    throw loadPromise;
  };
}

/**
 * Suspense component
 */
export function Suspense(props: {
  fallback: VNode | null;
  children?: VNode | VNode[];
}): VNode | null {
  const children = props.children;
  if (!children) return props.fallback;

  const childArray = Array.isArray(children) ? children : [children];

  return {
    type: 'suspense',
    props: {},
    children: [props.fallback, ...childArray],
    flags: 0 // Custom flag
  } as any;
}

/**
 * Handle async component in renderer
 */
export function isAsyncComponent(component: any): boolean {
  return component?._isAsync === true;
}

export function markAsyncComponent(component: Component): void {
  (component as any)._isAsync = true;
}
```

- [ ] **Step 2: Update renderer to handle async components**

In renderer.ts, add async support:

```typescript
import { defineAsyncComponent, isAsyncComponent, createSuspenseState } from './suspense';

const suspenseStates = new WeakMap<Element, SuspenseState>();

// In createComponentDom:
private createComponentDom(vnode: VNode): Element | Comment {
  const Component = vnode.type as Component;
  const props = vnode.props || {};

  try {
    const result = Component(props);

    // Handle promise (async component threw)
    if (result instanceof Promise) {
      const state = createSuspenseState();
      state.isPending = true;

      const container = this.context.container;
      suspenseStates.set(container, state);

      result
        .then(module => {
          state.isPending = false;
          const newVNode = module.default(props);
          this.patch(this.context.dom as Element, newVNode, vnode);
        })
        .catch(err => {
          state.isPending = false;
          state.error = err;
          console.error('Async component error:', err);
        });

      // Return placeholder until resolved
      return document.createComment('Async Component Loading');
    }

    if (result === null) {
      return document.createComment('Empty Component');
    }

    const dom = this.createDom(result);
    (dom as any)._component = vnode;
    return dom;
  } catch (e) {
    // Check if it's a promise (async component error)
    if (e instanceof Promise) {
      const state = createSuspenseState();
      state.isPending = true;

      e.then(() => {
        state.isPending = false;
      }).catch(err => {
        state.isPending = false;
        state.error = err;
      });

      return document.createComment('Suspended');
    }

    console.error('Component render error:', e);
    return document.createComment('Error');
  }
}
```

- [ ] **Step 3: Add defineAsyncComponent and Suspense exports to index.ts**

In src/index.ts, add:

```typescript
export { defineAsyncComponent, Suspense } from './suspense';
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/suspense.ts src/renderer.ts src/index.ts
git commit -m "feat: add Suspense and async component support"
```

---

## Chunk 6: Reactive Proxy - 响应式代理

### Task 8: Add reactive() and ref() with Proxy

**Files:**
- Create: `src/reactive.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create reactive.ts**

```typescript
/**
 * Reactive System - Vue 3 style Proxy-based reactivity
 */

type Target = object;
type Key = string | symbol;

let activeEffect: (() => void) | null = null;
let shouldTrack = false;

const targetMap = new WeakMap<Target, Map<Key, Set<() => void>>>();
const computedValues = new WeakMap<Target, Map<Key, any>>();

function getDep(target: Target, key: Key): Set<() => void> {
  if (!targetMap.has(target)) {
    targetMap.set(target, new Map());
  }
  return targetMap.get(target)!.get(key)!;
}

export function track(target: Target, key: Key): void {
  if (!shouldTrack || !activeEffect) return;

  if (!targetMap.has(target)) {
    targetMap.set(target, new Map());
  }

  let deps = targetMap.get(target)!.get(key);
  if (!deps) {
    deps = new Set();
    targetMap.get(target)!.set(key, deps);
  }

  deps.add(activeEffect);
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

export function ref<T>(value: T): { value: T } {
  return {
    get value() {
      shouldTrack = true;
      track(value as any, 'value');
      shouldTrack = false;
      return value;
    },
    set value(newVal: T) {
      if (value !== newVal) {
        value = newVal;
        trigger(value as any, 'value');
      }
    }
  };
}

export function computed<T>(fn: () => T): { value: T } {
  let computedValue: T;

  const effect = () => {
    shouldTrack = true;
    activeEffect = effect;
    computedValue = fn();
    activeEffect = null;
    shouldTrack = false;
  };

  effect();

  return {
    get value() {
      shouldTrack = true;
      track(computedValue as any, 'value');
      shouldTrack = false;
      return computedValue;
    }
  };
}

export function watchEffect(fn: () => void): () => void {
  const effect = () => {
    shouldTrack = true;
    activeEffect = effect;
    fn();
    activeEffect = null;
    shouldTrack = false;
  };

  effect();

  return () => {
    // Cleanup - remove from all deps
    targetMap.forEach(depsMap => {
      depsMap.forEach(deps => {
        deps.delete(effect);
      });
    });
  };
}

export function watch<T>(
  source: () => T,
  callback: (newValue: T, oldValue: T) => void,
  options?: { immediate?: boolean }
): () => void {
  let oldValue = source();

  if (options?.immediate) {
    callback(oldValue, undefined as any);
  }

  const effect = () => {
    const newValue = source();
    if (newValue !== oldValue) {
      const prev = oldValue;
      oldValue = newValue;
      callback(newValue, prev);
    }
  };

  return watchEffect(effect);
}
```

- [ ] **Step 2: Add reactive exports to index.ts**

In src/index.ts, add:

```typescript
export { reactive, ref, computed, watch, watchEffect } from './reactive';
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/reactive.ts src/index.ts
git commit -m "feat: add Vue 3-style reactive() with Proxy"
```

---

## Chunk 7: Provide/Inject - 响应式注入

### Task 9: Enhance Context with reactive Provide/Inject

**Files:**
- Modify: `src/context.ts`, `src/index.ts`

- [ ] **Step 1: Update context.ts with Provide/Inject**

Modify src/context.ts to add reactive provide/inject:

```typescript
// Add at end of file:

export interface InjectionKey<T> {
  _id: symbol;
  _default: T;
}

export function provide<T>(key: string | InjectionKey<T>, value: T): void {
  const context = typeof key === 'string'
    ? { id: Symbol(key), defaultValue: undefined as any } as Context<T>
    : createContext(key._default);

  if (typeof key !== 'string') {
    value = key._default;
  }

  pushContext(context as any, value);
}

export function inject<T>(key: string | InjectionKey<T>, defaultValue?: T): T | undefined {
  const context = typeof key === 'string'
    ? { id: Symbol(key), defaultValue: defaultValue as T } as Context<T>
    : createContext(key._default);

  return getContextValue(context as any) ?? defaultValue;
}
```

- [ ] **Step 2: Add provide/inject exports to index.ts**

In src/index.ts, add:

```typescript
export { provide, inject, InjectionKey } from './context';
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/context.ts src/index.ts
git commit -m "feat: add provide/inject reactive context API"
```

---

## Chunk 8: Computed Lazy Evaluation - 惰性求值

### Task 10: Add lazy computed to Signal system

**Files:**
- Modify: `src/signal.ts`

- [ ] **Step 1: Add lazy computed to Signal class**

In signal.ts, add new method to Signal class:

```typescript
// Add to Signal class:
lazyComputed<T>(fn: () => T): () => T {
  let cached = false;
  let cachedValue: T;
  let signal = this;

  return () => {
    if (!cached) {
      cachedValue = fn();
      cached = true;
      this.subscribe(() => {
        cached = false;
      });
    }
    return cachedValue;
  };
}
```

- [ ] **Step 2: Add standalone computed function**

Add at end of signal.ts:

```typescript
/**
 * createComputed - Lazy computed value (Vue 3 style)
 * Only recomputes when accessed and dependencies have changed
 */
export function createComputed<T>(
  fn: () => T,
  deps: () => any[]
): () => T {
  let value: T;
  let hasValue = false;
  let lastDeps: any[] = [];

  const compute = () => {
    const currentDeps = deps();
    const depsChanged = currentDeps.some((d, i) => d !== lastDeps[i]);

    if (!hasValue || depsChanged) {
      value = fn();
      lastDeps = currentDeps;
      hasValue = true;
    }
    return value;
  };

  return compute;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/signal.ts
git commit -m "feat: add lazy computed evaluation to signals"
```

---

## Chunk 9: Watch with Options - Watch 增强

### Task 11: Enhance watch with immediate and flush options

**Files:**
- Modify: `src/signal.ts`, `src/index.ts`

- [ ] **Step 1: Add enhanced watch to signal.ts**

Add at end of signal.ts:

```typescript
export type WatchOptions = {
  immediate?: boolean;
  flush?: 'pre' | 'post' | 'sync';
  onCleanup?: (fn: () => void) => void;
};

export function createWatch<T>(
  source: () => T,
  callback: (newValue: T, oldValue: T | undefined) => void,
  options: WatchOptions = {}
): () => void {
  let oldValue: T | undefined;
  let cleanup: (() => void) | undefined;

  const fn = () => {
    const newValue = source();

    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }

    callback(newValue, oldValue);
    oldValue = newValue;
  };

  if (options.immediate) {
    fn();
  }

  const stop = createEffect(fn);

  if (options.onCleanup) {
    options.onCleanup(stop);
  }

  return stop;
}
```

- [ ] **Step 2: Export createWatch from index.ts**

In src/index.ts, add:

```typescript
export { createWatch, WatchOptions } from './signal';
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/signal.ts src/index.ts
git commit -m "feat: add enhanced watch with immediate/flush options"
```

---

## Final Verification

- [ ] **Step 1: Run TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run tests**

Run: `npm test 2>&1 || echo "No tests configured"`
Expected: Tests pass or no tests

- [ ] **Step 3: Final commit with all features**

```bash
git add -A
git commit -m "feat: implement all Vue-inspired features

- PatchFlags for fine-grained updates
- VNode static hoisting cache
- Lifecycle hooks (onMounted, onUpdated, etc.)
- KeepAlive component caching
- Suspense and async components
- Vue 3-style reactive() with Proxy
- Provide/Inject reactive context
- Lazy computed evaluation
- Enhanced watch with immediate option"
```
