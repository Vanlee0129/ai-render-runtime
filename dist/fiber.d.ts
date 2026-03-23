import { VNode, Component } from './vdom';
export declare const FiberFlags: {
    readonly NoFlags: 0;
    readonly PerformedWork: 1;
    readonly Placement: 2;
    readonly Update: 4;
    readonly Deletion: 8;
    readonly ChildDeletion: 16;
};
export type FiberTag = 'host' | 'component' | 'fragment' | 'text';
export interface Fiber {
    type: string | Component | null;
    tag: FiberTag;
    key: string | number | null;
    stateNode: Element | Text | null;
    props: Record<string, any>;
    return: Fiber | null;
    child: Fiber | null;
    sibling: Fiber | null;
    index: number;
    pendingProps: Record<string, any>;
    memoizedProps: Record<string, any>;
    memoizedState: any;
    flags: number;
    subtreeFlags: number;
    alternate: Fiber | null;
    stateMachine?: () => void;
}
export interface FiberRoot {
    current: Fiber | null;
    container: Element;
    finishedWork: Fiber | null;
}
export declare function createFiber(vnode: VNode | null, key: string | number | null): Fiber;
export declare function createWorkInProgress(current: Fiber, pendingProps: Record<string, any>): Fiber;
export declare function beginWork(workInProgress: Fiber): Fiber | null;
export declare function completeWork(workInProgress: Fiber): Fiber | null;
export declare function commitWork(finishedWork: Fiber): void;
//# sourceMappingURL=fiber.d.ts.map