import { VNodeFlags } from './vdom';
export const FiberFlags = {
    NoFlags: 0,
    PerformedWork: 1,
    Placement: 2,
    Update: 4,
    Deletion: 8,
    ChildDeletion: 16,
};
export function createFiber(vnode, key) {
    const tag = !vnode
        ? 'host'
        : vnode.flags === VNodeFlags.Text || vnode.type === 'text'
            ? 'text'
            : vnode.flags === VNodeFlags.Component
                ? 'component'
                : vnode.type === 'fragment' || vnode.type === 'Fragment'
                    ? 'fragment'
                    : 'host';
    return {
        type: vnode?.type ?? null,
        tag,
        key: key ?? vnode?.key ?? null,
        stateNode: null,
        props: vnode?.props ?? {},
        return: null,
        child: null,
        sibling: null,
        index: 0,
        pendingProps: vnode?.props ?? {},
        memoizedProps: vnode?.props ?? {},
        memoizedState: null,
        flags: FiberFlags.NoFlags,
        subtreeFlags: FiberFlags.NoFlags,
        alternate: null,
    };
}
export function createWorkInProgress(current, pendingProps) {
    const workInProgress = {
        ...current,
        pendingProps,
        memoizedProps: pendingProps,
        flags: FiberFlags.NoFlags,
        subtreeFlags: FiberFlags.NoFlags,
    };
    return workInProgress;
}
export function beginWork(workInProgress) {
    // TODO: Implement component mounting/update logic
    return completeWork(workInProgress);
}
export function completeWork(workInProgress) {
    // TODO: Implement completion logic
    return null;
}
export function commitWork(finishedWork) {
    // TODO: Implement commit phase
}
//# sourceMappingURL=fiber.js.map