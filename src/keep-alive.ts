/**
 * KeepAlive - 组件缓存
 * 缓存组件实例，避免重复创建和销毁
 */

import { VNode, Component } from './vdom';

interface KeepAliveCache {
  key: string | number;
  vnode: VNode;
  component: Component;
  dom: Element | Text | Comment;
}

const keepAliveCache = new Map<string | number, KeepAliveCache>();

export interface KeepAliveProps {
  include?: (string | number)[];
  exclude?: (string | number)[];
  children?: VNode | VNode[];
}

function shouldKeepAlive(key: string | number, props: KeepAliveProps): boolean {
  if (props.exclude?.includes(key)) {
    return false;
  }
  if (props.include && !props.include.includes(key)) {
    return false;
  }
  return true;
}

export function getKeepAliveCache(key: string | number): KeepAliveCache | undefined {
  return keepAliveCache.get(key);
}

export function setKeepAliveCache(key: string | number, entry: KeepAliveCache): void {
  if (keepAliveCache.size >= 100) {
    const firstKey = keepAliveCache.keys().next().value;
    if (firstKey !== undefined) {
      keepAliveCache.delete(firstKey);
    }
  }
  keepAliveCache.set(key, entry);
}

export function removeKeepAliveCache(key: string | number): void {
  keepAliveCache.delete(key);
}

export function clearKeepAliveCache(): void {
  keepAliveCache.clear();
}

/**
 * KeepAlive component - wraps children and caches their DOM
 */
export function KeepAlive(props: KeepAliveProps): VNode | null {
  const children = props.children;
  if (!children) return null;

  const childArray = Array.isArray(children) ? children : [children];
  const child = childArray[0];

  if (!child || typeof child !== 'object') return null;

  const key = child.key ?? 'default';

  // Mark the child vnode with keepAliveKey for renderer
  (child as any)._keepAliveKey = key;
  (child as any)._keepAliveProps = props;

  return child;
}