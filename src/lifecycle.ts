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

function getOrCreateHooks(component: Component): LifecycleHooks {
  if (!componentLifecycleMap.has(component)) {
    componentLifecycleMap.set(component, {});
  }
  return componentLifecycleMap.get(component)!;
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
