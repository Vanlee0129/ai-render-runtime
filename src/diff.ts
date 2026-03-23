/**
 * AI Render Runtime - Diff Algorithm
 * 基于 React 的协调算法
 */

import { VNode, VNodeFlags, isSameVNodeType, VNodeProps } from './vdom';

export interface Patch {
  type: PatchType;
  node: Element | Text | Comment;
  props?: Record<string, any>;
  newNode?: VNode;
  oldNode?: VNode;
  index?: number;
}

export enum PatchType {
  REPLACE = 'REPLACE',      // 替换整个节点
  REMOVE = 'REMOVE',        // 删除节点
  INSERT = 'INSERT',        // 插入节点
  UPDATE = 'UPDATE',        // 更新属性/子节点
  TEXT = 'TEXT',            // 更新文本
  MOVE = 'MOVE',            // 移动节点
}

/**
 * Diff 两棵虚拟树
 * 返回需要执行的补丁列表
 */
export function diff(
  newVNode: VNode | null,
  oldVNode: VNode | null,
  parent: Element | Comment | null
): Patch[] {
  const patches: Patch[] = [];
  
  // 处理替换或新增
  if (newVNode === null) {
    if (oldVNode !== null) {
      patches.push({
        type: PatchType.REMOVE,
        node: null as any,
        oldNode: oldVNode
      });
    }
    return patches;
  }
  
  if (oldVNode === null) {
    patches.push({
      type: PatchType.INSERT,
      node: null as any,
      newNode: newVNode
    });
    return patches;
  }
  
  // 文本节点
  if (newVNode.flags === VNodeFlags.Text || oldVNode.flags === VNodeFlags.Text) {
    if (typeof newVNode.type === 'string' && newVNode.type === 'text') {
      const newText = newVNode.children[0];
      const oldText = oldVNode.children[0];
      if (newText !== oldText) {
        patches.push({
          type: PatchType.TEXT,
          node: null as any,
          props: { text: newText }
        });
      }
    } else if (isSameVNodeType(newVNode, oldVNode)) {
      // 同类型但不是文本
      diffElement(newVNode, oldVNode, patches);
    } else {
      patches.push({
        type: PatchType.REPLACE,
        node: null as any,
        newNode: newVNode,
        oldNode: oldVNode
      });
    }
    return patches;
  }
  
  // 元素或组件
  if (!isSameVNodeType(newVNode, oldVNode)) {
    patches.push({
      type: PatchType.REPLACE,
      node: null as any,
      newNode: newVNode,
      oldNode: oldVNode
    });
    return patches;
  }
  
  // 同类型，更新属性和子节点
  diffElement(newVNode, oldVNode, patches);
  
  return patches;
}

/**
 * Diff 元素节点
 */
function diffElement(
  newVNode: VNode,
  oldVNode: VNode,
  patches: Patch[]
) {
  // 更新属性
  const propsPatch = diffProps(newVNode.props, oldVNode.props);
  if (propsPatch) {
    patches.push({
      type: PatchType.UPDATE,
      node: null as any,
      props: propsPatch
    });
  }
  
  // 更新子节点
  diffChildren(newVNode.children, oldVNode.children, patches);
}

/**
 * Diff 属性
 */
function diffProps(
  newProps: VNodeProps,
  oldProps: VNodeProps
): Record<string, any> | null {
  const patches: Record<string, any> = {};
  let hasChanges = false;
  
  // 遍历新属性
  for (const key in newProps) {
    if (key === 'children' || key === 'key') continue;
    
    const newValue = newProps[key];
    const oldValue = oldProps[key];
    
    if (newValue !== oldValue) {
      patches[key] = newValue;
      hasChanges = true;
    }
  }
  
  // 遍历旧属性，找被删除的
  for (const key in oldProps) {
    if (key === 'children' || key === 'key') continue;
    
    if (!(key in newProps)) {
      patches[key] = null; // null 表示删除
      hasChanges = true;
    }
  }
  
  return hasChanges ? patches : null;
}

/**
 * Diff 子节点
 */
function diffChildren(
  newChildren: (VNode | string)[],
  oldChildren: (VNode | string)[],
  patches: Patch[]
) {
  // 将字符串转换为简单对象
  const newList = newChildren.map((child, i) => ({
    vnode: typeof child === 'string' ? { type: 'text', props: {}, children: [child], flags: VNodeFlags.Text, key: `text-${i}` } as VNode : child,
    index: i
  }));
  
  const oldList = oldChildren.map((child, i) => ({
    vnode: typeof child === 'string' ? { type: 'text', props: {}, children: [child], flags: VNodeFlags.Text, key: `text-${i}` } as VNode : child,
    index: i
  }));
  
  // 简单 Diff：key 匹配
  const oldKeys = new Map<string | number, typeof oldList[0]>();
  oldList.forEach(item => {
    const key = item.vnode.key || item.index;
    oldKeys.set(key, item);
  });
  
  const newKeys = new Map<string | number, typeof newList[0]>();
  newList.forEach(item => {
    const key = item.vnode.key || item.index;
    newKeys.set(key, item);
  });
  
  // 处理新增和更新的
  newList.forEach((newItem, i) => {
    const key = newItem.vnode.key || i;
    const oldItem = oldKeys.get(key);
    
    if (!oldItem) {
      // 新增
      patches.push({
        type: PatchType.INSERT,
        node: null as any,
        newNode: newItem.vnode,
        index: i
      });
    } else {
      // 递归 Diff
      const childPatches = diff(newItem.vnode, oldItem.vnode, null);
      childPatches.forEach(p => {
        p.index = i;
        patches.push(p);
      });
    }
  });
  
  // 处理删除
  oldList.forEach((oldItem, i) => {
    const key = oldItem.vnode.key || i;
    if (!newKeys.has(key)) {
      patches.push({
        type: PatchType.REMOVE,
        node: null as any,
        oldNode: oldItem.vnode,
        index: i
      });
    }
  });
}

/**
 * 调和算法 - React 风格
 */
export function reconcile(
  newVNode: VNode,
  domNode: Element | Text | Comment
): Element | Text | Comment {
  // 如果是同一节点类型，直接更新
  // 这里简化处理，完整实现需要维护 fiber tree
  return domNode as any;
}

/**
 * 批量 Diff
 */
export function batchDiff(
  newSpec: any[],
  oldSpec: any[]
): {
  added: any[];
  removed: any[];
  updated: any[];
} {
  const added: any[] = [];
  const removed: any[] = [];
  const updated: any[] = [];
  
  const newKeys = new Set(newSpec.map((s, i) => s.key || s.id || i));
  const oldKeys = new Set(oldSpec.map((s, i) => s.key || s.id || i));
  
  // 找新增
  newSpec.forEach(s => {
    const key = s.key || s.id;
    if (!oldKeys.has(key)) {
      added.push(s);
    }
  });
  
  // 找删除
  oldSpec.forEach(s => {
    const key = s.key || s.id;
    if (!newKeys.has(key)) {
      removed.push(s);
    }
  });
  
  // 找更新
  newSpec.forEach((newS, i) => {
    const key = newS.key || newS.id || i;
    const oldS = oldSpec.find((s, j) => (s.key || s.id || j) === key);
    if (oldS) {
      // 简单比较：序列化后对比
      if (JSON.stringify(newS) !== JSON.stringify(oldS)) {
        updated.push({ new: newS, old: oldS });
      }
    }
  });
  
  return { added, removed, updated };
}

/**
 * Key-based children diff - O(n) algorithm
 * Uses position-based matching for elements with keys
 */
export function diffChildrenKeyed(
  newChildren: (VNode | string)[],
  oldChildren: (VNode | string)[]
): Patch[] {
  const patches: Patch[] = [];

  // Convert to keyed maps
  const newKeyed = new Map<string | number, { vnode: VNode; index: number }>();
  const oldKeyed = new Map<string | number, { vnode: VNode; index: number }>();

  newChildren.forEach((child, i) => {
    const vnode = typeof child === 'string'
      ? { type: 'text', props: {}, children: [child], flags: VNodeFlags.Text, key: `text-${i}` } as VNode
      : child;
    const key = vnode.key ?? i;
    newKeyed.set(key, { vnode, index: i });
  });

  oldChildren.forEach((child, i) => {
    const vnode = typeof child === 'string'
      ? { type: 'text', props: {}, children: [child], flags: VNodeFlags.Text, key: `text-${i}` } as VNode
      : child;
    const key = vnode.key ?? i;
    oldKeyed.set(key, { vnode, index: i });
  });

  // Track position mappings
  const newKeys = Array.from(newKeyed.keys());
  const oldKeys = Array.from(oldKeyed.keys());

  // Simple approach: walk through and match
  let oldIndex = 0;
  let newIndex = 0;

  // Process in order, handling inserts and removes
  while (newIndex < newKeys.length) {
    const newKey = newKeys[newIndex];
    const oldKey = oldKeys[oldIndex];

    if (newKey === oldKey) {
      // Match - diff recursively
      const newItem = newKeyed.get(newKey)!;
      const oldItem = oldKeyed.get(oldKey)!;
      const childPatches = diff(newItem.vnode, oldItem.vnode, null);
      childPatches.forEach(p => { p.index = newIndex; patches.push(p); });
      newIndex++;
      oldIndex++;
    } else if (oldKeyed.has(newKey)) {
      // Key exists in old but not at current position - it was moved
      const oldItem = oldKeyed.get(newKey)!;
      patches.push({
        type: PatchType.MOVE,
        node: null as any,
        newNode: newKeyed.get(newKey)!.vnode,
        oldNode: oldItem.vnode,
        index: newIndex
      });
      newIndex++;
    } else {
      // New key - insert
      patches.push({
        type: PatchType.INSERT,
        node: null as any,
        newNode: newKeyed.get(newKey)!.vnode,
        index: newIndex
      });
      newIndex++;
    }
  }

  // Remaining old keys are deletions
  while (oldIndex < oldKeys.length) {
    const oldKey = oldKeys[oldIndex];
    if (!newKeyed.has(oldKey)) {
      patches.push({
        type: PatchType.REMOVE,
        node: null as any,
        oldNode: oldKeyed.get(oldKey)!.vnode,
        index: oldIndex
      });
    }
    oldIndex++;
  }

  return patches;
}
