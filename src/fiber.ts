import { VNode, VNodeFlags, Component } from './vdom';

export const FiberFlags = {
  NoFlags: 0,
  PerformedWork: 1,
  Placement: 2,
  Update: 4,
  Deletion: 8,
  ChildDeletion: 16,
} as const;

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
  // For components
  stateMachine?: () => void;
}

export interface FiberRoot {
  current: Fiber | null;
  container: Element;
  finishedWork: Fiber | null;
}

export function createFiber(vnode: VNode | null, key: string | number | null): Fiber {
  const tag: FiberTag = !vnode
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

export function createWorkInProgress(current: Fiber, pendingProps: Record<string, any>): Fiber {
  const workInProgress = {
    ...current,
    pendingProps,
    memoizedProps: pendingProps,
    flags: FiberFlags.NoFlags,
    subtreeFlags: FiberFlags.NoFlags,
  };
  return workInProgress;
}

export function beginWork(workInProgress: Fiber): Fiber | null {
  // TODO: Implement component mounting/update logic
  return completeWork(workInProgress);
}

export function completeWork(workInProgress: Fiber): Fiber | null {
  // TODO: Implement completion logic
  return null;
}

export function commitWork(finishedWork: Fiber): void {
  // TODO: Implement commit phase
}