/**
 * AI Render Runtime - Diff Algorithm
 * 基于 React 的协调算法
 */
import { VNodeFlags, isSameVNodeType } from './vdom';
export var PatchType;
(function (PatchType) {
    PatchType["REPLACE"] = "REPLACE";
    PatchType["REMOVE"] = "REMOVE";
    PatchType["INSERT"] = "INSERT";
    PatchType["UPDATE"] = "UPDATE";
    PatchType["TEXT"] = "TEXT";
    PatchType["MOVE"] = "MOVE";
})(PatchType || (PatchType = {}));
/**
 * Diff 两棵虚拟树
 * 返回需要执行的补丁列表
 */
export function diff(newVNode, oldVNode, parent) {
    const patches = [];
    // 处理替换或新增
    if (newVNode === null) {
        if (oldVNode !== null) {
            patches.push({
                type: PatchType.REMOVE,
                node: null,
                oldNode: oldVNode
            });
        }
        return patches;
    }
    if (oldVNode === null) {
        patches.push({
            type: PatchType.INSERT,
            node: null,
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
                    node: null,
                    props: { text: newText }
                });
            }
        }
        else if (isSameVNodeType(newVNode, oldVNode)) {
            // 同类型但不是文本
            diffElement(newVNode, oldVNode, patches);
        }
        else {
            patches.push({
                type: PatchType.REPLACE,
                node: null,
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
            node: null,
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
function diffElement(newVNode, oldVNode, patches) {
    // 更新属性
    const propsPatch = diffProps(newVNode.props, oldVNode.props);
    if (propsPatch) {
        patches.push({
            type: PatchType.UPDATE,
            node: null,
            props: propsPatch
        });
    }
    // 更新子节点
    diffChildren(newVNode.children, oldVNode.children, patches);
}
/**
 * Diff 属性
 */
function diffProps(newProps, oldProps) {
    const patches = {};
    let hasChanges = false;
    // 遍历新属性
    for (const key in newProps) {
        if (key === 'children' || key === 'key')
            continue;
        const newValue = newProps[key];
        const oldValue = oldProps[key];
        if (newValue !== oldValue) {
            patches[key] = newValue;
            hasChanges = true;
        }
    }
    // 遍历旧属性，找被删除的
    for (const key in oldProps) {
        if (key === 'children' || key === 'key')
            continue;
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
function diffChildren(newChildren, oldChildren, patches) {
    // 将字符串转换为简单对象
    const newList = newChildren.map((child, i) => ({
        vnode: typeof child === 'string' ? { type: 'text', props: {}, children: [child], flags: VNodeFlags.Text, key: `text-${i}` } : child,
        index: i
    }));
    const oldList = oldChildren.map((child, i) => ({
        vnode: typeof child === 'string' ? { type: 'text', props: {}, children: [child], flags: VNodeFlags.Text, key: `text-${i}` } : child,
        index: i
    }));
    // 简单 Diff：key 匹配
    const oldKeys = new Map();
    oldList.forEach(item => {
        const key = item.vnode.key || item.index;
        oldKeys.set(key, item);
    });
    const newKeys = new Map();
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
                node: null,
                newNode: newItem.vnode,
                index: i
            });
        }
        else {
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
                node: null,
                oldNode: oldItem.vnode,
                index: i
            });
        }
    });
}
/**
 * 调和算法 - React 风格
 */
export function reconcile(newVNode, domNode) {
    // 如果是同一节点类型，直接更新
    // 这里简化处理，完整实现需要维护 fiber tree
    return domNode;
}
/**
 * 批量 Diff
 */
export function batchDiff(newSpec, oldSpec) {
    const added = [];
    const removed = [];
    const updated = [];
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
 * Uses position-based matching with move detection
 */
export function diffChildrenKeyed(newChildren, oldChildren) {
    const patches = [];
    // Convert to keyed maps with vnode and position
    const newKeyed = new Map();
    const oldKeyed = new Map();
    newChildren.forEach((child, i) => {
        const vnode = typeof child === 'string'
            ? { type: 'text', props: {}, children: [child], flags: VNodeFlags.Text, key: `text-${i}` }
            : child;
        const key = vnode.key ?? i;
        newKeyed.set(key, { vnode, index: i });
    });
    oldChildren.forEach((child, i) => {
        const vnode = typeof child === 'string'
            ? { type: 'text', props: {}, children: [child], flags: VNodeFlags.Text, key: `text-${i}` }
            : child;
        const key = vnode.key ?? i;
        oldKeyed.set(key, { vnode, index: i });
    });
    // Track which old keys have been matched
    const matchedOldKeys = new Set();
    // First pass: handle items in order, detecting moves
    let lastMatchedOldIndex = -1;
    for (let newIndex = 0; newIndex < newChildren.length; newIndex++) {
        const child = newChildren[newIndex];
        const vnode = typeof child === 'string'
            ? { type: 'text', props: {}, children: [child], flags: VNodeFlags.Text, key: `text-${newIndex}` }
            : child;
        const key = vnode.key ?? newIndex;
        const oldEntry = oldKeyed.get(key);
        if (!oldEntry) {
            // New item - insert
            patches.push({
                type: PatchType.INSERT,
                node: null,
                newNode: vnode,
                index: newIndex
            });
        }
        else {
            matchedOldKeys.add(key);
            if (oldEntry.index > lastMatchedOldIndex) {
                // Item is in order - diff recursively
                const childPatches = diff(vnode, oldEntry.vnode, null);
                childPatches.forEach(p => { p.index = newIndex; patches.push(p); });
                lastMatchedOldIndex = oldEntry.index;
            }
            else {
                // Item was moved (appeared earlier in old list) - treat as UPDATE/MOVE
                patches.push({
                    type: PatchType.MOVE,
                    node: null,
                    newNode: vnode,
                    oldNode: oldEntry.vnode,
                    index: newIndex
                });
            }
        }
    }
    // Second pass: remaining old items are deletions
    oldChildren.forEach((child, oldIndex) => {
        const vnode = typeof child === 'string'
            ? { type: 'text', props: {}, children: [child], flags: VNodeFlags.Text, key: `text-${oldIndex}` }
            : child;
        const key = vnode.key ?? oldIndex;
        if (!matchedOldKeys.has(key)) {
            patches.push({
                type: PatchType.REMOVE,
                node: null,
                oldNode: vnode,
                index: oldIndex
            });
        }
    });
    return patches;
}
//# sourceMappingURL=diff.js.map