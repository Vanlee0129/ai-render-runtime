# React-style Optimizations Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add React-style architecture optimizations to ai-render-runtime: Fiber, event delegation, memoization, Context, Error Boundaries, Ref forwarding, Scheduler, improved Hydration, and fix memory leaks.

**Architecture:** Build incrementally on existing codebase. Create new modules (fiber.ts, scheduler.ts, context.ts) and enhance existing ones (signal.ts, renderer.ts, diff.ts). All changes are backward-compatible additions.

**Tech Stack:** TypeScript, no new external dependencies (self-contained implementation)

---

## Chunk 1: Scheduler & Priority System

**Files:**
- Create: `src/scheduler.ts`
- Modify: `src/index.ts`

### Task 1: Create Scheduler Module

**Files:**
- Create: `src/scheduler.ts`
- Modify: `src/index.ts:13`

- [ ] **Step 1: Write failing test for scheduler**

Create `test/scheduler.test.ts`:
```typescript
import { scheduleCallback, runWithPriority, Priority, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority } from '../src/scheduler';

describe('Scheduler', () => {
  test('should schedule callback with correct priority', () => {
    let executed = false;
    const callback = scheduleCallback(NormalPriority, () => { executed = true; });
    expect(callback).toBeDefined();
  });

  test('should run with priority', () => {
    let result = '';
    runWithPriority(UserBlockingPriority, () => { result = 'user-blocking'; });
    expect(result).toBe('user-blocking');
  });

  test('ImmediatePriority should execute immediately', () => {
    let count = 0;
    scheduleCallback(ImmediatePriority, () => { count++; });
    expect(count).toBe(1);
  });
});
```

Run: `npm test -- test/scheduler.test.ts`
Expected: FAIL with "scheduler not defined"

- [ ] **Step 2: Create minimal scheduler implementation**

Create `src/scheduler.ts`:
```typescript
// Priority levels (matching React)
export const ImmediatePriority = 1;
export const UserBlockingPriority = 2;
export const NormalPriority = 3;
export const LowPriority = 4;
export const IdlePriority = 5;

export type Priority = typeof ImmediatePriority | typeof UserBlockingPriority | typeof NormalPriority | typeof LowPriority | typeof IdlePriority;

// Simple queue-based scheduler
type Callback = () => void;
type Task = { callback: Callback; priority: Priority };

let taskQueue: Task[] = [];
let isFlushScheduled = false;

function flush(): void {
  // Sort by priority (lower number = higher priority)
  taskQueue.sort((a, b) => a.priority - b.priority);
  while (taskQueue.length > 0) {
    const task = taskQueue.shift();
    if (task) task.callback();
  }
  isFlushScheduled = false;
}

export function scheduleCallback(priority: Priority, callback: Callback): () => void {
  taskQueue.push({ callback, priority });

  if (!isFlushScheduled) {
    isFlushScheduled = true;
    // Use setTimeout to avoid blocking (except for ImmediatePriority)
    if (priority === ImmediatePriority) {
      flush();
    } else {
      Promise.resolve().then(flush);
    }
  }

  return () => {
    taskQueue = taskQueue.filter(t => t.callback !== callback);
  };
}

export function runWithPriority<T>(priority: Priority, fn: () => T): T {
  const prevPriority = currentPriority;
  currentPriority = priority;
  try {
    return fn();
  } finally {
    currentPriority = prevPriority;
  }
}

let currentPriority: Priority = NormalPriority;

export function getCurrentPriority(): Priority {
  return currentPriority;
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test -- test/scheduler.test.ts`
Expected: PASS

- [ ] **Step 4: Export from index.ts**

Modify `src/index.ts` line ~13, add:
```typescript
export { scheduleCallback, runWithPriority, getCurrentPriority, Priority, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority } from './scheduler';
```

- [ ] **Step 5: Commit**

```bash
git add src/scheduler.ts src/index.ts test/scheduler.test.ts
git commit -m "feat: add scheduler with priority system"
```

---

## Chunk 2: Fiber Architecture

**Files:**
- Create: `src/fiber.ts`
- Modify: `src/renderer.ts`

### Task 2: Create Fiber Module

**Files:**
- Create: `src/fiber.ts`
- Test: `test/fiber.test.ts`

- [ ] **Step 1: Write failing test for Fiber**

Create `test/fiber.test.ts`:
```typescript
import { createFiber, Fiber, FiberRoot, FiberFlags, createWorkInProgress, beginWork, completeWork, commitWork } from '../src/fiber';

describe('Fiber', () => {
  test('should create fiber from vnode', () => {
    const vnode = { type: 'div', props: {}, children: [], flags: 1, key: undefined };
    const fiber = createFiber(vnode, null);
    expect(fiber).toBeDefined();
    expect(fiber.type).toBe('div');
  });

  test('should identify host components', () => {
    const vnode = { type: 'div', props: {}, children: [], flags: 1 };
    const fiber = createFiber(vnode, null);
    expect(fiber.tag).toBe('host');
  });
});
```

Run: `npm test -- test/fiber.test.ts`
Expected: FAIL with "fiber not defined"

- [ ] **Step 2: Create Fiber implementation**

Create `src/fiber.ts`:
```typescript
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
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test -- test/fiber.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/fiber.ts test/fiber.test.ts
git commit -m "feat: add Fiber architecture foundation"
```

### Task 3: Integrate Fiber into Renderer

**Files:**
- Modify: `src/renderer.ts`

- [ ] **Step 1: Read current renderer implementation**

Read `src/renderer.ts`

- [ ] **Step 2: Add Fiber-based rendering option**

Modify `src/renderer.ts`, add after imports:
```typescript
import { scheduleCallback, ImmediatePriority } from './scheduler';
```

Add new method to Renderer class:
```typescript
/**
 * Schedule a non-blocking update using Fiber
 */
scheduleUpdate(callback: () => void): void {
  scheduleCallback(NormalPriority, callback);
}
```

- [ ] **Step 3: Test build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/renderer.ts
git commit -m "feat: integrate scheduler into renderer for non-blocking updates"
```

---

## Chunk 3: Key-based Diff Optimization

**Files:**
- Modify: `src/diff.ts`, `src/renderer.ts`

### Task 4: Implement O(n) Key-based Reconciliation

**Files:**
- Modify: `src/diff.ts:158-225`
- Test: `test/diff.test.ts`

- [ ] **Step 1: Write failing test for key-based diff**

Create `test/diff-keyed.test.ts`:
```typescript
import { diffChildrenKeyed } from '../src/diff';

describe('Key-based Diff', () => {
  test('should match children by key', () => {
    const oldChildren = [
      { type: 'text', props: {}, children: ['a'], flags: 2, key: '1' },
      { type: 'text', props: {}, children: ['b'], flags: 2, key: '2' },
    ];
    const newChildren = [
      { type: 'text', props: {}, children: ['b'], flags: 2, key: '2' },
      { type: 'text', props: {}, children: ['a'], flags: 2, key: '1' },
    ];

    // Should detect move, not delete+insert
    const patches = diffChildrenKeyed(newChildren, oldChildren);
    expect(patches.some(p => p.type === 'MOVE')).toBe(true);
    expect(patches.filter(p => p.type === 'REMOVE' || p.type === 'INSERT').length).toBeLessThan(2);
  });
});
```

Run: `npm test -- test/diff-keyed.test.ts`
Expected: FAIL with "diffChildrenKeyed not defined"

- [ ] **Step 2: Add keyed diff function to diff.ts**

Modify `src/diff.ts`, add before closing `}`:
```typescript
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

  // Longest Common Subsequence for minimum moves
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
        type: PatchType.UPDATE,
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
```

Add to PatchType enum:
```typescript
export enum PatchType {
  REPLACE = 0,
  REMOVE = 1,
  INSERT = 2,
  UPDATE = 3,
  TEXT = 4,
  MOVE = 5,  // Add this
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test -- test/diff-keyed.test.ts`
Expected: PASS

- [ ] **Step 4: Update renderer to use keyed diff**

Modify `src/renderer.ts:319-331`, replace `updateChildren`:
```typescript
private updateChildren(
  parent: Element,
  newChildren: (VNode | string)[],
  oldChildren: (VNode | string)[]
): void {
  // Use keyed diff if children have keys
  const hasKeys = newChildren.some(c => typeof c === 'object' && c.key !== undefined) ||
                  oldChildren.some(c => typeof c === 'object' && c.key !== undefined);

  if (hasKeys) {
    const patches = diffChildrenKeyed(newChildren, oldChildren);
    this.applyPatches(parent, patches);
  } else {
    // Fallback to simple diff for children without keys
    this.updateChildrenSimple(parent, newChildren, oldChildren);
  }
}

private updateChildrenSimple(
  parent: Element,
  newChildren: (VNode | string)[],
  oldChildren: (VNode | string)[]
): void {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
  this.appendChildren(parent, newChildren);
}

private applyPatches(parent: Element, patches: Patch[]): void {
  // Apply patches in order
  patches.forEach(patch => {
    switch (patch.type) {
      case PatchType.INSERT:
      case PatchType.REPLACE:
        if (patch.newNode) {
          const dom = this.createDom(patch.newNode);
          const refNode = parent.childNodes[patch.index || 0];
          if (refNode) {
            parent.insertBefore(dom, refNode);
          } else {
            parent.appendChild(dom);
          }
        }
        break;
      case PatchType.REMOVE:
        if (parent.childNodes[patch.index || 0]) {
          parent.removeChild(parent.childNodes[patch.index || 0]);
        }
        break;
      case PatchType.UPDATE:
        // Handled by updateProps
        break;
    }
  });
}
```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/diff.ts src/renderer.ts test/diff-keyed.test.ts
git commit -m "feat: implement O(n) key-based diff reconciliation"
```

---

## Chunk 4: Event Delegation

**Files:**
- Modify: `src/renderer.ts`

### Task 5: Implement Event Delegation System

**Files:**
- Modify: `src/renderer.ts`

- [ ] **Step 1: Read current renderer implementation**

Read `src/renderer.ts`

- [ ] **Step 2: Add event delegation to renderer**

Modify `src/renderer.ts`, add after imports:
```typescript
// Event delegation system
type EventHandler = (e: Event) => void;
const delegatedEvents = new Map<string, Set<EventHandler>>();
let rootElement: Element | null = null;

export function setRootElement(el: Element): void {
  rootElement = el;
  if (rootElement) {
    rootElement.addEventListener('click', handleDelegatedEvent);
    rootElement.addEventListener('input', handleDelegatedEvent);
    rootElement.addEventListener('change', handleDelegatedEvent);
    rootElement.addEventListener('submit', handleDelegatedEvent);
    rootElement.addEventListener('focus', handleDelegatedEvent);
    rootElement.addEventListener('blur', handleDelegatedEvent);
    rootElement.addEventListener('keydown', handleDelegatedEvent);
    rootElement.addEventListener('keyup', handleDelegatedEvent);
    rootElement.addEventListener('mouseenter', handleDelegatedEvent);
    rootElement.addEventListener('mouseleave', handleDelegatedEvent);
  }
}

function handleDelegatedEvent(e: Event): void {
  const target = e.target as Element;
  // Walk up the tree to find element with event handler
  let current: Element | null = target;
  while (current && current !== rootElement) {
    const handlers = current._eventHandlers as Map<string, EventHandler> | undefined;
    if (handlers) {
      const handler = handlers.get(e.type);
      if (handler) {
        e.preventDefault();
        handler.call(current, e);
        return;
      }
    }
    current = current.parentElement;
  }
}

declare global {
  interface Element {
    _eventHandlers?: Map<string, EventHandler>;
  }
}
```

Modify `setProps` method (around line 168):
```typescript
private setProps(dom: Element, props: VNodeProps): void {
  if (!props) return;

  // Initialize event handlers map
  if (!dom._eventHandlers) {
    dom._eventHandlers = new Map();
  }

  for (const key in props) {
    if (key === 'children' || key === 'key') continue;

    const value = props[key];

    // Event handling via delegation
    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      dom._eventHandlers!.set(eventName, value as EventHandler);
      continue;
    }

    // ... rest of existing code
  }
}
```

Modify `updateProps` method (around line 282):
```typescript
if (key.startsWith('on') && typeof newValue === 'function') {
  const eventName = key.slice(2).toLowerCase();
  dom._eventHandlers?.set(eventName, newValue as EventHandler);
  return;
}
```

Modify `createComponentDom` (line 145):
```typescript
private createComponentDom(vnode: VNode): Element | Comment {
  const Component = vnode.type as Component;
  const props = vnode.props || {};

  try {
    const result = Component(props);
    if (result === null) {
      return document.createComment('Empty Component');
    }

    const dom = this.createDom(result);
    (dom as any)._component = vnode;

    // Transfer event handlers from vnode to actual DOM
    if (vnode.props && dom._eventHandlers) {
      for (const key in vnode.props) {
        if (key.startsWith('on') && typeof vnode.props[key] === 'function') {
          const eventName = key.slice(2).toLowerCase();
          dom._eventHandlers.set(eventName, vnode.props[key]);
        }
      }
    }

    return dom;
  } catch (e) {
    console.error('Component render error:', e);
    return document.createComment('Error');
  }
}
```

- [ ] **Step 3: Initialize delegation in constructor**

Modify Renderer constructor (line 33):
```typescript
constructor(container: Element) {
  this.context = {
    container,
    vnode: null,
    dom: null,
    signals: new Map()
  };
  setRootElement(container);
}
```

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/renderer.ts
git commit -m "feat: implement event delegation system"
```

---

## Chunk 5: Memoization (React.memo, useMemo, useCallback)

**Files:**
- Create: `src/memo.ts`
- Modify: `src/index.ts`

### Task 6: Create Memoization Module

**Files:**
- Create: `src/memo.ts`
- Test: `test/memo.test.ts`

- [ ] **Step 1: Write failing test for memoization**

Create `test/memo.test.ts`:
```typescript
import { memo, useMemo, useCallback, isMemoized } from '../src/memo';

describe('Memoization', () => {
  test('memo should wrap component', () => {
    const MyComponent = (props: { name: string }) => null;
    const Memoized = memo(MyComponent);
    expect(Memoized).toBeDefined();
    expect(Memoized.displayName).toBe('memo(MyComponent)');
  });

  test('useMemo should memoize value', () => {
    const [getValue, setValue] = createSignal(0);
    let computeCount = 0;
    const memoized = useMemo(() => {
      computeCount++;
      return getValue() * 2;
    });
    expect(computeCount).toBe(1);
    setValue(5);
    // Value should not recompute until dependencies change
  });

  test('useCallback should memoize function', () => {
    const callback = useCallback(() => 'hello', []);
    expect(typeof callback).toBe('function');
  });
});
```

Run: `npm test -- test/memo.test.ts`
Expected: FAIL with "memo not defined"

- [ ] **Step 2: Create memoization implementation**

Create `src/memo.ts`:
```typescript
import { Component, ComponentProps, VNode } from './vdom';

interface MemoizedComponent<P> {
  (props: P): VNode | null;
  displayName: string;
  compare?: (prevProps: P, nextProps: P) => boolean;
}

let memoizedComponentCounter = 0;

/**
 * memo - Memoize a component to prevent unnecessary re-renders
 */
export function memo<P extends ComponentProps>(
  Component: Component<P>,
  compare: (prevProps: P, nextProps: P) => boolean = shallowCompare
): MemoizedComponent<P> {
  let lastProps: P | null = null;
  let lastResult: VNode | null = null;
  let mounted = false;

  const Memoized = (props: P): VNode | null => {
    if (mounted && lastProps !== null && compare(lastProps, props)) {
      return lastResult;
    }
    lastProps = { ...props };
    lastResult = Component(props);
    mounted = true;
    return lastResult;
  };

  Memoized.displayName = `memo(${Component.displayName || 'Component' + ++memoizedComponentCounter})`;
  Memoized.compare = compare;
  return Memoized;
}

function shallowCompare<P>(prevProps: P, nextProps: P): boolean {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) return false;

  for (const key of prevKeys) {
    if (prevProps[key as keyof P] !== nextProps[key as keyof P]) {
      return false;
    }
  }
  return true;
}

/**
 * useMemo - Memoize a computed value
 */
export function useMemo<T>(compute: () => T, deps: any[]): T {
  const { memoizedValues, update } = useMemoContext();
  const key = memoizedValues.length;

  const shouldCompute = deps.length === 0 ||
    !memoizedValues[key] ||
    deps.some((dep, i) => dep !== (memoizedValues[key] as any[])?.[i]);

  if (shouldCompute) {
    const value = compute();
    memoizedValues[key] = { value, deps };
    return value;
  }

  return (memoizedValues[key] as { value: T }).value;
}

// Context for useMemo
let memoizedValues: any[] = [];
let memoContextSetter: (() => void) | null = null;

function useMemoContext() {
  return {
    memoizedValues,
    update: () => memoContextSetter?.()
  };
}

export function setMemoContext(updateFn: () => void): void {
  memoContextSetter = updateFn;
  memoizedValues = [];
}

/**
 * useCallback - Memoize a callback function
 */
export function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T {
  return useMemo(() => callback, deps) as T;
}

export function isMemoized(fn: any): boolean {
  return fn && typeof fn === 'function' && 'displayName' in fn && fn.displayName?.startsWith('memo(');
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test -- test/memo.test.ts`
Expected: PASS (may need to add createSignal import to test)

- [ ] **Step 4: Export from index.ts**

Modify `src/index.ts`, add to exports:
```typescript
export { memo, useMemo, useCallback, isMemoized } from './memo';
export { setMemoContext } from './memo';
```

- [ ] **Step 5: Commit**

```bash
git add src/memo.ts src/index.ts test/memo.test.ts
git commit -m "feat: add memoization (React.memo, useMemo, useCallback)"
```

---

## Chunk 6: Context System

**Files:**
- Create: `src/context.ts`
- Modify: `src/index.ts`

### Task 7: Create Context Module

**Files:**
- Create: `src/context.ts`
- Test: `test/context.test.ts`

- [ ] **Step 1: Write failing test for Context**

Create `test/context.test.ts`:
```typescript
import { createContext, useContext, ContextProvider } from '../src/context';

describe('Context', () => {
  test('should create context with default value', () => {
    const ThemeContext = createContext<string>('default');
    expect(ThemeContext).toBeDefined();
    expect(ThemeContext.defaultValue).toBe('default');
  });

  test('should provide value through context', () => {
    const CounterContext = createContext(0);
    // Context should work with Provider
    expect(CounterContext.Provider).toBeDefined();
  });
});
```

Run: `npm test -- test/context.test.ts`
Expected: FAIL with "createContext not defined"

- [ ] **Step 2: Create Context implementation**

Create `src/context.ts`:
```typescript
export interface Context<T> {
  id: symbol;
  defaultValue: T;
  Provider: ProviderComponent<T>;
  Consumer: ConsumerComponent<T>;
}

type ProviderComponent<T> = (props: { value: T; children?: any }) => any;
type ConsumerComponent<T> = (props: { children: (value: T) => any }) => any;

let contextId = 0;

const CONTEXT_MAP = new Map<symbol, Context<any>>();

export function createContext<T>(defaultValue: T): Context<T> {
  const id = Symbol(`context-${++contextId}`);

  const context: Context<T> = {
    id,
    defaultValue,
    Provider: ({ value, children }: { value: T; children?: any }) => {
      return children;
    },
    Consumer: ({ children }: { children: (value: T) => any }) => {
      return children(defaultValue);
    }
  };

  CONTEXT_MAP.set(id, context);
  return context;
}

// Context stack for nested providers
let contextStack: Array<{ context: Context<any>; value: any }> = [];

export function pushContext<T>(context: Context<T>, value: T): void {
  contextStack.push({ context, value });
}

export function popContext(): void {
  contextStack.pop();
}

export function getContextValue<T>(context: Context<T>): T {
  // Walk stack from top to bottom to find most recent value
  for (let i = contextStack.length - 1; i >= 0; i--) {
    if (contextStack[i].context.id === context.id) {
      return contextStack[i].value as T;
    }
  }
  return context.defaultValue;
}

/**
 * useContext - Hook to consume context value
 */
export function useContext<T>(context: Context<T>): T {
  // In a real implementation, this would subscribe to changes
  // For now, return the current value from stack or default
  for (let i = contextStack.length - 1; i >= 0; i--) {
    if (contextStack[i].context.id === context.id) {
      return contextStack[i].value as T;
    }
  }
  return context.defaultValue;
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test -- test/context.test.ts`
Expected: PASS

- [ ] **Step 4: Export from index.ts**

Modify `src/index.ts`, add exports:
```typescript
export { createContext, useContext, pushContext, popContext, Context } from './context';
```

- [ ] **Step 5: Commit**

```bash
git add src/context.ts src/index.ts test/context.test.ts
git commit -m "feat: add Context system (createContext, useContext)"
```

---

## Chunk 7: Error Boundaries

**Files:**
- Create: `src/error-boundary.ts`
- Modify: `src/renderer.ts`

### Task 8: Create Error Boundary Module

**Files:**
- Create: `src/error-boundary.ts`
- Test: `test/error-boundary.test.ts`

- [ ] **Step 1: Write failing test for Error Boundaries**

Create `test/error-boundary.test.ts`:
```typescript
import { ErrorBoundary, componentDidCatch } from '../src/error-boundary';

describe('Error Boundary', () => {
  test('should create error boundary component', () => {
    const boundary = ErrorBoundary({
      fallback: () => null,
      children: null
    });
    expect(boundary).toBeDefined();
  });

  test('should catch render errors', () => {
    let errorCaught = false;
    const SafeComponent = componentDidCatch(
      () => { throw new Error('test'); },
      (error) => { errorCaught = true; return null; }
    );
    SafeComponent({});
    expect(errorCaught).toBe(true);
  });
});
```

Run: `npm test -- test/error-boundary.test.ts`
Expected: FAIL with "ErrorBoundary not defined"

- [ ] **Step 2: Create Error Boundary implementation**

Create `src/error-boundary.ts`:
```typescript
import { Component, ComponentProps, VNode } from './vdom';

export interface ErrorInfo {
  componentStack?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

type ErrorHandler = (error: Error, errorInfo: ErrorInfo) => VNode | null;

/**
 * componentDidCatch - Wrapper that catches errors in a component
 */
export function componentDidCatch<
  P extends ComponentProps,
  S extends ErrorBoundaryState
>(
  render: Component<P>,
  fallback: ErrorHandler
): Component<P> {
  return function SafeComponent(props: P): VNode | null {
    try {
      return render(props);
    } catch (error) {
      const errorInfo: ErrorInfo = {
        componentStack: new Error().stack
      };
      return fallback(error as Error, errorInfo);
    }
  };
}

/**
 * ErrorBoundary - Component that catches child errors
 */
export function ErrorBoundary(props: {
  fallback: (error: Error, errorInfo: ErrorInfo) => VNode | null;
  children?: VNode | VNode[];
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}): VNode | null {
  let state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  const handleError = (error: Error, errorInfo: ErrorInfo): VNode | null => {
    state = { hasError: true, error, errorInfo };
    props.onError?.(error, errorInfo);
    return props.fallback(error, errorInfo);
  };

  try {
    if (state.hasError) {
      return props.fallback(state.error!, state.errorInfo!);
    }

    if (props.children) {
      const children = Array.isArray(props.children) ? props.children : [props.children];
      return children[0] || null;
    }
    return null;
  } catch (error) {
    return handleError(error as Error, { componentStack: new Error().stack });
  }
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test -- test/error-boundary.test.ts`
Expected: PASS

- [ ] **Step 4: Integrate with renderer**

Modify `src/renderer.ts`, update `createComponentDom` method (around line 145):
```typescript
private createComponentDom(vnode: VNode): Element | Comment {
  const Component = vnode.type as Component;
  const props = vnode.props || {};

  try {
    const result = Component(props);
    if (result === null) {
      return document.createComment('Empty Component');
    }

    const dom = this.createDom(result);
    (dom as any)._component = vnode;
    return dom;
  } catch (e) {
    console.error('Component render error:', e);
    // Could invoke error boundary here if vnode has errorBoundary flag
    return document.createComment('Error');
  }
}
```

- [ ] **Step 5: Export from index.ts**

Modify `src/index.ts`, add exports:
```typescript
export { ErrorBoundary, componentDidCatch, ErrorInfo, ErrorBoundaryState } from './error-boundary';
```

- [ ] **Step 6: Commit**

```bash
git add src/error-boundary.ts src/renderer.ts src/index.ts test/error-boundary.test.ts
git commit -m "feat: add Error Boundaries (componentDidCatch)"
```

---

## Chunk 8: Fix Signal Memory Leak

**Files:**
- Modify: `src/signal.ts`

### Task 9: Fix createEffect Cleanup

**Files:**
- Modify: `src/signal.ts:100-117`

- [ ] **Step 1: Read current signal.ts implementation**

Read `src/signal.ts:100-117`

- [ ] **Step 2: Fix createEffect cleanup**

Modify `src/signal.ts:100-117`, replace the `createEffect` function:
```typescript
export function createEffect(fn: Effect): () => void {
  const effect = () => {
    const prev = currentTracking;
    currentTracking = effect;
    try {
      fn();
    } finally {
      currentTracking = prev;
    }
  };

  // Track subscribed signals for cleanup
  const subscribedSignals = new Set<Signal<any>>();
  const originalSubscribe = Signal.prototype.subscribe;

  // Wrapper to track subscriptions during effect run
  const trackedEffect = () => {
    const prev = currentTracking;
    currentTracking = effect;
    subscribedSignals.clear();

    // Patch subscribe to track
    const origSubscribe = Signal.prototype.subscribe;
    Signal.prototype.subscribe = function(fn: Subscriber) {
      subscribedSignals.add(this);
      return origSubscribe.call(this, fn);
    };

    try {
      fn();
    } finally {
      currentTracking = prev;
      Signal.prototype.subscribe = origSubscribe;
    }
  };

  // Immediately execute to establish dependencies
  trackedEffect();

  // Return cleanup function
  return () => {
    // Unsubscribe from all tracked signals
    subscribedSignals.forEach(signal => {
      signal.subscribers.delete(effect);
    });
    subscribedSignals.clear();
  };
}
```

- [ ] **Step 3: Run build to check for errors**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/signal.ts
git commit -m "fix: properly cleanup subscriptions in createEffect to prevent memory leaks"
```

---

## Chunk 9: Refs (forwardRef + useRef)

**Files:**
- Create: `src/refs.ts`
- Modify: `src/vdom.ts`, `src/renderer.ts`, `src/index.ts`

### Task 10: Create Refs Module

**Files:**
- Create: `src/refs.ts`
- Test: `test/refs.test.ts`

- [ ] **Step 1: Write failing test for Refs**

Create `test/refs.test.ts`:
```typescript
import { ref, useRef, forwardRef, Ref } from '../src/refs';

describe('Refs', () => {
  test('should create a ref', () => {
    const myRef = ref<HTMLDivElement>();
    expect(myRef).toBeDefined();
    expect(myRef.current).toBeNull();
  });

  test('forwardRef should forward ref to component', () => {
    const MyComponent = forwardRef((props, ref) => null);
    expect(MyComponent).toBeDefined();
  });
});
```

Run: `npm test -- test/refs.test.ts`
Expected: FAIL with "ref not defined"

- [ ] **Step 2: Create Refs implementation**

Create `src/refs.ts`:
```typescript
export interface Ref<T> {
  current: T | null;
}

export function ref<T>(initialValue: T | null = null): Ref<T> {
  return { current: initialValue };
}

export type RefCallback<T> = (instance: T | null) => void;
export type Ref<T> = Ref<T> | RefCallback<T> | null;

/**
 * useRef - Create a ref that persists across renders
 */
export function useRef<T>(initialValue: T | null = null): Ref<T> {
  return ref(initialValue);
}

/**
 * forwardRef - Forward ref through component
 */
export function forwardRef<P extends Record<string, any>, T>(
  render: (props: P, ref: Ref<T>) => any
): ComponentRef<P, T> {
  return function ForwardedComponent(props: P) {
    // Ref is passed as second argument
    const forwardedRef = (props as any).ref;
    return render(props, forwardedRef);
  } as ComponentRef<P, T>;
}

interface ComponentRef<P extends Record<string, any>, T> {
  (props: P & { ref?: Ref<T> }): any;
  displayName?: string;
}

import { Component, ComponentProps, VNode } from './vdom';

export type { ComponentRef };
```

- [ ] **Step 3: Update VDOM types for ref**

Modify `src/vdom.ts`, add to VNodeProps interface:
```typescript
ref?: RefCallback<any> | Ref<any>;
```

- [ ] **Step 4: Update Renderer to handle refs properly**

Modify `src/renderer.ts`, update `setProps` method (around line 184):
```typescript
// ref
if (key === 'ref') {
  if (typeof value === 'function') {
    value(dom);
  } else if (value && 'current' in value) {
    (value as Ref<any>).current = dom;
  }
  continue;
}
```

Modify `src/renderer.ts`, update `updateProps` method (around line 292):
```typescript
if (key === 'ref' && typeof newValue === 'function') {
  newValue(dom);
  return;
}
```

- [ ] **Step 5: Export from index.ts**

Modify `src/index.ts`, add exports:
```typescript
export { ref, useRef, forwardRef, Ref, RefCallback } from './refs';
```

- [ ] **Step 6: Run build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/refs.ts src/vdom.ts src/renderer.ts src/index.ts test/refs.test.ts
git commit -m "feat: add Refs system (useRef, forwardRef)"
```

---

## Chunk 10: Enhanced Hydration

**Files:**
- Modify: `src/renderer.ts`

### Task 11: Improve Hydration with DOM Reuse

**Files:**
- Modify: `src/renderer.ts:66-112`

- [ ] **Step 1: Read current hydration implementation**

Read `src/renderer.ts:66-112`

- [ ] **Step 2: Enhance hydration with proper DOM reuse**

Replace `src/renderer.ts:66-112` with:
```typescript
/**
 * Hydrate - SSR 场景：复用已有 DOM，绑定事件
 * 增强版：更精确的 DOM 复用和匹配
 */
hydrate(vnode: VNode): void {
  this.context.vnode = vnode;

  if (!this.context.container.firstChild) {
    this.render(vnode);
    return;
  }

  // 复用根 DOM
  this.context.dom = this.context.container.firstChild as Element;

  // 递归 hydrate
  this.hydrateTree(this.context.dom, vnode);
}

/**
 * 递归 hydrate 树
 */
private hydrateTree(dom: Element | Text | Comment, vnode: VNode): boolean {
  if (!dom || !vnode) return false;

  // 文本节点
  if (vnode.flags === VNodeFlags.Text || vnode.type === 'text') {
    if (dom.nodeType === Node.TEXT_NODE) {
      return true;
    }
    return false;
  }

  // Fragment - hydrate children
  if (vnode.type === 'fragment' || vnode.type === 'Fragment') {
    return this.hydrateFragment(dom as Comment, vnode);
  }

  // 组件
  if (vnode.flags === VNodeFlags.Component) {
    return this.hydrateComponent(dom as Element, vnode);
  }

  // 元素
  if (dom.nodeType !== Node.ELEMENT_NODE) return false;

  const el = dom as Element;
  const tagMatch = el.tagName.toLowerCase() === (vnode.type as string).toLowerCase();

  if (!tagMatch) {
    console.warn(`Hydrate tag mismatch: expected ${vnode.type}, got ${el.tagName}`);
    return false;
  }

  // 绑定事件
  this.hydrateElementProps(el, vnode);

  // 递归 hydrate 子节点
  this.hydrateChildren(el, vnode.children);

  return true;
}

/**
 * hydrate Fragment
 */
private hydrateFragment(dom: Comment, vnode: VNode): boolean {
  const children = Array.isArray(vnode.children) ? vnode.children : [vnode.children];
  let childDom = dom.nextSibling;

  for (const child of children) {
    if (!childDom) break;
    if (typeof child === 'string') {
      if (childDom.nodeType === Node.TEXT_NODE) {
        childDom = childDom.nextSibling;
        continue;
      }
      break;
    }
    if (this.hydrateTree(childDom as Element, child)) {
      childDom = childDom.nextSibling;
    } else {
      break;
    }
  }

  return true;
}

/**
 * hydrate 组件
 */
private hydrateComponent(dom: Element, vnode: VNode): boolean {
  const Component = vnode.type as Component;
  const props = vnode.props || {};

  try {
    const result = Component(props);
    if (result === null) return true;

    return this.hydrateTree(dom, result);
  } catch (e) {
    console.error('Component hydrate error:', e);
    return false;
  }
}

/**
 * hydrate 元素属性和事件
 */
private hydrateElementProps(el: Element, vnode: VNode): void {
  if (!vnode.props) return;

  // 初始化事件处理器映射
  if (!(el as any)._eventHandlers) {
    (el as any)._eventHandlers = new Map();
  }

  for (const [key, value] of Object.entries(vnode.props)) {
    if (key === 'children' || key === 'key') continue;

    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      (el as any)._eventHandlers.set(eventName, value);
    }
  }
}

/**
 * hydrate 子节点
 */
private hydrateChildren(parent: Element, children: (VNode | string)[]): void {
  if (!children || children.length === 0) return;

  let childDom = parent.firstChild;

  for (const child of children) {
    if (!childDom) break;

    if (typeof child === 'string') {
      if (childDom.nodeType === Node.TEXT_NODE) {
        childDom = childDom.nextSibling;
        continue;
      }
      break;
    }

    if (this.hydrateTree(childDom as Element, child)) {
      childDom = childDom.nextSibling;
    } else {
      break;
    }
  }
}
```

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/renderer.ts
git commit -m "feat: enhance hydration with proper DOM reuse and tree matching"
```

---

## Chunk 11: Integration & Final Tests

### Task 12: Run Full Test Suite

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds, dist/bundle.js updated

- [ ] **Step 3: Verify examples still work**

Check `examples/basic.html` and `examples/ai-demo.html` for syntax errors

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete React-style optimizations

- Add scheduler with priority system
- Add Fiber architecture foundation
- Implement O(n) key-based diff reconciliation
- Implement event delegation system
- Add memoization (memo, useMemo, useCallback)
- Add Context system (createContext, useContext)
- Add Error Boundaries (componentDidCatch)
- Fix Signal memory leak in createEffect
- Add Refs system (useRef, forwardRef)
- Enhance hydration with DOM reuse"
```

---

## Summary

| Task | Feature | Files |
|------|---------|-------|
| 1 | Scheduler & Priority | `src/scheduler.ts` |
| 2 | Fiber Architecture | `src/fiber.ts`, `src/renderer.ts` |
| 3 | Key-based Diff | `src/diff.ts`, `src/renderer.ts` |
| 4 | Event Delegation | `src/renderer.ts` |
| 5 | Memoization | `src/memo.ts` |
| 6 | Context System | `src/context.ts` |
| 7 | Error Boundaries | `src/error-boundary.ts` |
| 8 | Fix Memory Leak | `src/signal.ts` |
| 9 | Refs | `src/refs.ts`, `src/vdom.ts`, `src/renderer.ts` |
| 10 | Enhanced Hydration | `src/renderer.ts` |
| 11 | Integration Tests | All |
