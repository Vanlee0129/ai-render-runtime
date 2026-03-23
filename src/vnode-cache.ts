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
    if (firstKey !== undefined) {
      staticVNodeCache.delete(firstKey);
    }
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
