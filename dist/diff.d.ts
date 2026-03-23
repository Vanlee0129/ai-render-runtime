/**
 * AI Render Runtime - Diff Algorithm
 * 基于 React 的协调算法
 */
import { VNode } from './vdom';
export interface Patch {
    type: PatchType;
    node: Element | Text | Comment;
    props?: Record<string, any>;
    newNode?: VNode;
    oldNode?: VNode;
    index?: number;
}
export declare enum PatchType {
    REPLACE = "REPLACE",// 替换整个节点
    REMOVE = "REMOVE",// 删除节点
    INSERT = "INSERT",// 插入节点
    UPDATE = "UPDATE",// 更新属性/子节点
    TEXT = "TEXT",// 更新文本
    MOVE = "MOVE"
}
/**
 * Diff 两棵虚拟树
 * 返回需要执行的补丁列表
 */
export declare function diff(newVNode: VNode | null, oldVNode: VNode | null, parent: Element | Comment | null): Patch[];
/**
 * 调和算法 - React 风格
 */
export declare function reconcile(newVNode: VNode, domNode: Element | Text | Comment): Element | Text | Comment;
/**
 * 批量 Diff
 */
export declare function batchDiff(newSpec: any[], oldSpec: any[]): {
    added: any[];
    removed: any[];
    updated: any[];
};
/**
 * Key-based children diff - O(n) algorithm
 * Uses position-based matching with move detection
 */
export declare function diffChildrenKeyed(newChildren: (VNode | string)[], oldChildren: (VNode | string)[]): Patch[];
//# sourceMappingURL=diff.d.ts.map