# AI Native Runtime Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 AI Native Runtime 的 TypeScript 基础层，为未来 Rust Core 迁移做准备

**Architecture:** 三层架构 - Spec Contract 作为核心契约，连接 AI Engine 和 Rendering Runtime。当前重点是增强 TypeScript 实现，建立清晰的模块边界，为 Rust/WASM 迁移打好基础。

**Tech Stack:** TypeScript, WASM (未来), Rust (未来)

---

## Phase 1: 增强 Spec 契约

**目标:** 将当前的 ComponentSpec 扩展为完整的 Spec 契约（包含 version、intent、meta、actions）

### 任务 1.1: 创建 spec.ts 定义完整契约

**Files:**
- Create: `src/spec-contract.ts`

- [ ] **Step 1: 创建 TypeScript 接口定义**

```typescript
// src/spec-contract.ts

export const SPEC_VERSION = '1.0';

/**
 * 完整 Spec 契约 - AI Runtime 的核心数据类型
 */
export interface Spec {
  version: string;           // 契约版本，用于向后兼容
  intent: string;            // Intent 类型
  view: ViewSpec;            // 视图描述
  actions: ActionSpec[];     // 可用动作
  state: Record<string, any>; // 视图状态
  meta: SpecMeta;            // 元信息
}

/**
 * Spec 元信息
 */
export interface SpecMeta {
  createdAt: string;        // 创建时间 ISO 8601
  confidence: number;       // AI 置信度 0-1
  streaming: boolean;        // 是否流式生成
  source?: string;           // 来源标识
}

/**
 * 视图规格
 */
export interface ViewSpec {
  type: string;              // dashboard, list, form, custom
  layout?: LayoutSpec;       // 布局信息
  components: ComponentSpec[]; // 组件列表
}

/**
 * 布局规格
 */
export interface LayoutSpec {
  type: 'grid' | 'flex' | 'stack' | 'absolute';
  columns?: number;
  rows?: number;
  gap?: number;
  direction?: 'row' | 'column';
}

/**
 * 动作规格
 */
export interface ActionSpec {
  id: string;                // 唯一标识
  type: ActionType;          // 动作类型
  payload?: any;             // 负载
  label?: string;            // 显示标签
  disabled?: boolean;         // 是否禁用
  nextIntent?: string;       // 执行后可能的下一个 Intent
}

export type ActionType = 'navigation' | 'api' | 'mutation' | 'custom';

/**
 * 创建 Spec 的工厂函数
 */
export function createSpec(intent: string, view: ViewSpec, options?: Partial<Spec>): Spec {
  return {
    version: SPEC_VERSION,
    intent,
    view,
    actions: options?.actions || [],
    state: options?.state || {},
    meta: {
      createdAt: new Date().toISOString(),
      confidence: options?.meta?.confidence ?? 1.0,
      streaming: options?.meta?.streaming ?? false,
      source: options?.meta?.source,
    },
  };
}
```

- [ ] **Step 2: 导出到 index.ts**

在 `src/index.ts` 添加:
```typescript
export { Spec, SpecMeta, ViewSpec, LayoutSpec, ActionSpec, ActionType, createSpec, SPEC_VERSION } from './spec-contract';
```

- [ ] **Step 3: 提交**

```bash
git add src/spec-contract.ts src/index.ts
git commit -m "feat: add Spec contract with version, intent, meta, actions"
```

---

### 任务 1.2: 创建 ComponentSpec 到 Spec 的适配器

**Files:**
- Modify: `src/registry.ts:1-15`

- [ ] **Step 1: 修改 ComponentSpec 兼容旧格式**

更新 `src/registry.ts`:
```typescript
// 在文件开头添加
import { SPEC_VERSION, Spec, ViewSpec, ComponentSpec as SpecComponentSpec, ActionSpec, createSpec } from './spec-contract';

// 导出兼容的类型别名
export type ComponentSpec = SpecComponentSpec;

// 旧格式兼容：如果传入的是简单 ComponentSpec，自动包装为 Spec
export function wrapToSpec(spec: ComponentSpec | ComponentSpec[], intent = 'unknown'): Spec {
  const specs = Array.isArray(spec) ? spec : [spec];
  const view: ViewSpec = {
    type: 'custom',
    components: specs,
  };
  return createSpec(intent, view);
}
```

- [ ] **Step 2: 提交**

```bash
git add src/registry.ts
git commit -m "feat: add ComponentSpec to Spec wrapper for backward compatibility"
```

---

## Phase 2: State Store (Memento Pattern)

**目标:** 实现状态历史存储，支持快照保存和恢复

### 任务 2.1: 创建 StateStore 类

**Files:**
- Create: `src/state-store.ts`

- [ ] **Step 1: 实现 Memento Pattern 的 StateStore**

```typescript
// src/state-store.ts

import { Spec } from './spec-contract';

interface Snapshot {
  id: string;
  spec: Spec;
  timestamp: string;
  label?: string;
}

type StateChangeCallback = (spec: Spec) => void;

/**
 * StateStore - 使用 Memento Pattern 管理 Spec 状态历史
 *
 * 支持:
 * - 快照保存和恢复
 * - 状态历史遍历
 * - 变更订阅
 */
export class StateStore {
  private currentSpec: Spec | null = null;
  private snapshots: Map<string, Snapshot> = new Map();
  private history: string[] = [];  // snapshot IDs in order
  private subscribers: Set<StateChangeCallback> = new Set();
  private maxHistory: number;

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  /**
   * 获取当前 Spec
   */
  getState(): Spec | null {
    return this.currentSpec;
  }

  /**
   * 更新状态（自动保存快照）
   */
  setState(spec: Spec, label?: string): string {
    // 保存当前状态的快照
    const snapshotId = this.saveSnapshot(label);

    // 更新当前状态
    this.currentSpec = spec;
    this.notify();

    // 清理超过限制的旧快照
    this.pruneHistory();

    return snapshotId;
  }

  /**
   * 保存当前状态的快照
   */
  saveSnapshot(label?: string): string {
    if (!this.currentSpec) {
      throw new Error('Cannot save snapshot: no current spec');
    }

    const id = this.generateId();
    const snapshot: Snapshot = {
      id,
      spec: JSON.parse(JSON.stringify(this.currentSpec)),  // deep clone
      timestamp: new Date().toISOString(),
      label,
    };

    this.snapshots.set(id, snapshot);
    this.history.push(id);

    return id;
  }

  /**
   * 恢复到指定快照
   */
  restore(snapshotId: string): boolean {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      return false;
    }

    // 保存当前状态作为快照
    this.saveSnapshot('before_restore');

    // 恢复状态
    this.currentSpec = JSON.parse(JSON.stringify(snapshot.spec));  // deep clone
    this.notify();

    return true;
  }

  /**
   * 获取快照
   */
  getSnapshot(snapshotId: string): Snapshot | null {
    return this.snapshots.get(snapshotId) || null;
  }

  /**
   * 获取所有快照
   */
  getHistory(): Snapshot[] {
    return this.history
      .map(id => this.snapshots.get(id))
      .filter((s): s is Snapshot => s !== undefined);
  }

  /**
   * 撤销到上一个快照
   */
  undo(): boolean {
    if (this.history.length < 2) {
      return false;
    }

    // 移除当前快照
    const currentId = this.history.pop();
    this.snapshots.delete(currentId!);

    // 恢复到上一个
    const previousId = this.history[this.history.length - 1];
    const previous = this.snapshots.get(previousId!);
    if (previous) {
      this.currentSpec = JSON.parse(JSON.stringify(previous.spec));
      this.notify();
      return true;
    }

    return false;
  }

  /**
   * 订阅状态变化
   */
  subscribe(callback: StateChangeCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * 清空历史
   */
  clear(): void {
    this.snapshots.clear();
    this.history = [];
  }

  private notify(): void {
    if (this.currentSpec) {
      this.subscribers.forEach(cb => cb(this.currentSpec!));
    }
  }

  private pruneHistory(): void {
    while (this.history.length > this.maxHistory) {
      const oldestId = this.history.shift();
      if (oldestId) {
        this.snapshots.delete(oldestId);
      }
    }
  }

  private generateId(): string {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 单例导出
export const globalStateStore = new StateStore();
```

- [ ] **Step 2: 导出到 index.ts**

```bash
git add src/state-store.ts
git commit -m "feat: add StateStore with Memento pattern for snapshot/restore"
```

---

### 任务 2.2: 集成 StateStore 到 AIRender

**Files:**
- Modify: `src/index.ts:29-86`

- [ ] **Step 1: 在 AIRender 中添加 stateStore 支持**

在 `AIRender` 类中添加:

```typescript
export class AIRender {
  renderer: Renderer;
  container: Element;
  currentSpec: any[] = [];
  stateStore: StateStore;

  constructor(options: { container: Element | string; initialSpec?: any | any[]; enableHistory?: boolean }) {
    this.container = typeof options.container === 'string'
      ? document.querySelector(options.container)!
      : options.container;

    this.renderer = new Renderer(this.container);
    this.stateStore = new StateStore();

    if (options.initialSpec) {
      this.render(options.initialSpec);
    }
  }

  // ... existing methods ...

  /**
   * 保存当前状态快照
   */
  saveSnapshot(label?: string): string {
    return this.stateStore.saveSnapshot(label);
  }

  /**
   * 恢复到指定快照
   */
  restore(snapshotId: string): boolean {
    const spec = this.stateStore.getSnapshot(snapshotId)?.spec;
    if (spec) {
      this.render(spec);
      return true;
    }
    return false;
  }

  /**
   * 撤销到上一个状态
   */
  undo(): boolean {
    const success = this.stateStore.undo();
    if (success) {
      const spec = this.stateStore.getState();
      if (spec) {
        this.render(spec);
      }
    }
    return success;
  }

  /**
   * 获取状态历史
   */
  getHistory(): any[] {
    return this.stateStore.getHistory().map(s => s.spec);
  }

  /**
   * 订阅状态变化
   */
  onStateChange(callback: (spec: any) => void): () => void {
    return this.stateStore.subscribe(callback);
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/index.ts
git commit -m "feat: integrate StateStore into AIRender for history support"
```

---

## Phase 3: Intent Engine 抽象

**目标:** 分离意图理解和 Spec 生成，建立清晰的 AI 接口

### 任务 3.1: 创建 Intent Engine

**Files:**
- Create: `src/intent-engine.ts`

- [ ] **Step 1: 实现 Intent 接口和 IntentEngine 类**

```typescript
// src/intent-engine.ts

import { Spec, createSpec, ViewSpec } from './spec-contract';

/**
 * Intent - 结构化的用户意图
 */
export interface Intent {
  type: string;                    // intent 类型
  confidence: number;              // 置信度 0-1
  entities: Record<string, any>;   // 提取的实体
  raw?: string;                    // 原始输入
}

/**
 * Intent Handler - 处理特定类型 Intent 的函数
 */
export type IntentHandler = (
  intent: Intent,
  context: IntentContext
) => IntentResult | Promise<IntentResult>;

export interface IntentContext {
  state: any;                      // 当前应用状态
  history: Intent[];              // 历史 Intents
  user?: any;                     // 用户信息
}

export interface IntentResult {
  spec: Spec;                     // 生成的 Spec
  error?: string;                 // 错误信息
}

/**
 * IntentEngine - 管理 Intent 处理
 */
export class IntentEngine {
  private handlers: Map<string, IntentHandler> = new Map();
  private defaultHandler: IntentHandler | null = null;

  /**
   * 注册 Intent 处理器
   */
  register(intentType: string, handler: IntentHandler): void {
    this.handlers.set(intentType, handler);
  }

  /**
   * 设置默认处理器（处理未注册的 Intent）
   */
  setDefaultHandler(handler: IntentHandler): void {
    this.defaultHandler = handler;
  }

  /**
   * 处理 Intent
   */
  async process(intent: Intent, context: IntentContext): Promise<IntentResult> {
    const handler = this.handlers.get(intent.type) || this.defaultHandler;

    if (!handler) {
      return {
        spec: createSpec('error', { type: 'custom', components: [] }),
        error: `No handler for intent type: ${intent.type}`,
      };
    }

    try {
      return await handler(intent, context);
    } catch (e: any) {
      return {
        spec: createSpec('error', { type: 'custom', components: [] }),
        error: e.message,
      };
    }
  }

  /**
   * 获取已注册的 Intent 类型
   */
  getRegisteredIntents(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// 预定义的 Intent 类型
export const INTENT_TYPES = {
  SHOW: 'show',
  UPDATE: 'update',
  NAVIGATE: 'navigate',
  ACTION: 'action',
  ERROR: 'error',
  UNKNOWN: 'unknown',
} as const;

// 单例
export const intentEngine = new IntentEngine();
```

- [ ] **Step 2: 提交**

```bash
git add src/intent-engine.ts
git commit -m "feat: add IntentEngine for intent handling abstraction"
```

---

### 任务 3.2: 创建 Action Engine

**Files:**
- Create: `src/action-engine.ts`

- [ ] **Step 1: 实现 Action Engine**

```typescript
// src/action-engine.ts

import { ActionSpec, ActionType } from './spec-contract';

type ActionHandler = (payload: any) => Promise<ActionResult> | ActionResult;

interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  nextIntent?: string;
}

/**
 * ActionEngine - 执行动作的引擎
 */
export class ActionEngine {
  private handlers: Map<string, ActionHandler> = new Map();

  /**
   * 注册动作处理器
   */
  register(actionType: ActionType, handler: ActionHandler): void;
  register(actionId: string, handler: ActionHandler): void;
  register(actionIdOrType: string, handler: ActionHandler): void {
    this.handlers.set(actionIdOrType, handler);
  }

  /**
   * 执行动作
   */
  async execute(action: ActionSpec): Promise<ActionResult> {
    const handler = this.handlers.get(action.id) || this.handlers.get(action.type);

    if (!handler) {
      return {
        success: false,
        error: `No handler for action: ${action.id || action.type}`,
      };
    }

    try {
      const result = await handler(action.payload);
      return {
        success: true,
        data: result,
        nextIntent: action.nextIntent,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message,
      };
    }
  }

  /**
   * 批量执行动作
   */
  async executeBatch(actions: ActionSpec[]): Promise<ActionResult[]> {
    return Promise.all(actions.map(action => this.execute(action)));
  }
}

// 单例
export const actionEngine = new ActionEngine();
```

- [ ] **Step 2: 提交**

```bash
git add src/action-engine.ts
git commit -m "feat: add ActionEngine for action execution"
```

---

## Phase 4: Render Orchestrator

**目标:** 实现双路径渲染支持（标准路径 + 快速紧耦合路径）

### 任务 4.1: 创建 Render Orchestrator

**Files:**
- Create: `src/render-orchestrator.ts`

- [ ] **Step 1: 实现双路径渲染编排器**

```typescript
// src/render-orchestrator.ts

import { Spec, ViewSpec } from './spec-contract';

export type RenderMode = 'standard' | 'fast';

interface RenderPatch {
  type: 'style' | 'content' | 'visibility' | 'layout';
  path: string[];  // e.g., ['components', 0, 'style']
  value: any;
}

/**
 * RenderOrchestrator - 管理渲染路径
 *
 * 两种模式:
 * - standard: Intent → Spec → Rendering Runtime → UI
 * - fast: Intent → Render Orchestrator → UI (紧耦合路径)
 */
export class RenderOrchestrator {
  private mode: RenderMode = 'standard';
  private renderer: any;  // 实际渲染器引用
  private pendingPatches: RenderPatch[] = [];

  constructor(renderer: any) {
    this.renderer = renderer;
  }

  /**
   * 设置渲染模式
   */
  setMode(mode: RenderMode): void {
    this.mode = mode;
  }

  /**
   * 获取当前模式
   */
  getMode(): RenderMode {
    return this.mode;
  }

  /**
   * 渲染 Spec（标准路径）
   */
  renderSpec(spec: Spec): void {
    this.mode = 'standard';
    this.renderer.render(spec.view.components);
  }

  /**
   * 直接发送渲染补丁（快速路径）
   */
  patch(patch: RenderPatch): void {
    if (this.mode !== 'fast') {
      console.warn('RenderOrchestrator: patch() called in standard mode, switching to fast mode');
      this.mode = 'fast';
    }

    this.pendingPatches.push(patch);
    this.flushPatches();
  }

  /**
   * 流式更新（用于 AI 流式输出）
   */
  stream(partialSpec: Partial<Spec>): void {
    if (partialSpec.view) {
      // 增量更新视图
      this.applyPartialView(partialSpec.view);
    }
    if (partialSpec.state) {
      // 更新状态
      this.applyPartialState(partialSpec.state);
    }
    if (partialSpec.actions) {
      // 更新动作
      this.applyPartialActions(partialSpec.actions);
    }
  }

  /**
   * 切换到标准路径
   */
  useStandardPath(spec: Spec): void {
    this.flushPatches();  // 先刷新待处理的补丁
    this.mode = 'standard';
    this.renderSpec(spec);
  }

  /**
   * 批量应用补丁
   */
  private flushPatches(): void {
    // 实际渲染器实现细节...
    // 将 pendingPatches 应用到 DOM
    this.pendingPatches = [];
  }

  private applyPartialView(view: Partial<ViewSpec>): void {
    // 实现增量视图更新
  }

  private applyPartialState(state: Record<string, any>): void {
    // 实现增量状态更新
  }

  private applyPartialActions(actions: any[]): void {
    // 实现增量动作更新
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/render-orchestrator.ts
git commit -m "feat: add RenderOrchestrator with dual rendering paths"
```

---

## Phase 5: Platform Adapter 接口

**目标:** 定义平台抽象层，支持多平台部署

### 任务 5.1: 创建 Platform Adapter 接口

**Files:**
- Create: `src/platform-adapter.ts`

- [ ] **Step 1: 定义 PlatformAdapter 接口**

```typescript
// src/platform-adapter.ts

import { Spec, ActionSpec } from './spec-contract';

export type PlatformType = 'browser' | 'tauri' | 'node' | 'mobile';

/**
 * PlatformAdapter - 平台抽象接口
 *
 * 统一不同平台的:
 * - 渲染能力
 * - 平台 API
 * - 生命周期
 */
export interface PlatformAdapter {
  /** 平台标识 */
  platform: PlatformType;

  /**
   * 渲染 Spec 到平台
   */
  render(spec: Spec): void;

  /**
   * 销毁渲染
   */
  destroy(): void;

  // ===== 平台能力 =====

  /**
   * 读取剪贴板
   */
  readClipboard(): Promise<string>;

  /**
   * 写入剪贴板
   */
  writeClipboard(text: string): Promise<void>;

  /**
   * 显示通知
   */
  showNotification(title: string, body: string): Promise<void>;

  // ===== 生命周期 =====

  /**
   * 平台就绪回调
   */
  onReady(callback: () => void): void;

  /**
   * 销毁回调
   */
  onDestroy(callback: () => void): void;
}

/**
 * BrowserPlatformAdapter - 浏览器平台适配器
 */
export class BrowserPlatformAdapter implements PlatformAdapter {
  platform: PlatformType = 'browser';
  private container: Element;
  private renderCallback?: (spec: Spec) => void;

  constructor(container: Element) {
    this.container = container;
  }

  render(spec: Spec): void {
    this.renderCallback?.(spec);
  }

  destroy(): void {
    this.container.innerHTML = '';
  }

  async readClipboard(): Promise<string> {
    return navigator.clipboard.readText();
  }

  async writeClipboard(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
  }

  async showNotification(title: string, body: string): Promise<void> {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }

  onReady(callback: () => void): void {
    if (document.readyState === 'complete') {
      callback();
    } else {
      window.addEventListener('load', callback);
    }
  }

  onDestroy(callback: () => void): void {
    window.addEventListener('unload', callback);
  }

  // 绑定渲染器
  setRenderCallback(callback: (spec: Spec) => void): void {
    this.renderCallback = callback;
  }
}

/**
 * 创建平台适配器工厂
 */
export function createPlatformAdapter(container: Element | string, platform?: PlatformType): PlatformAdapter {
  const el = typeof container === 'string' ? document.querySelector(container)! : container;

  if (platform) {
    switch (platform) {
      case 'tauri':
        // Tauri 适配器未来实现
        break;
      case 'node':
        // Node.js 适配器未来实现
        break;
    }
  }

  // 默认返回浏览器适配器
  return new BrowserPlatformAdapter(el);
}
```

- [ ] **Step 2: 提交**

```bash
git add src/platform-adapter.ts
git commit -m "feat: add PlatformAdapter interface for multi-platform support"
```

---

## Phase 6: 整合所有模块到 AIRender

**目标:** 将所有新模块整合到统一的 AIRender API

### 任务 6.1: 增强 AIRender 整合度

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: 整合所有模块到 AIRender**

更新 AIRender 类:

```typescript
import { StateStore, globalStateStore } from './state-store';
import { IntentEngine, intentEngine, Intent, IntentContext } from './intent-engine';
import { ActionEngine, actionEngine } from './action-engine';
import { RenderOrchestrator } from './render-orchestrator';
import { PlatformAdapter, createPlatformAdapter } from './platform-adapter';
import { Spec } from './spec-contract';

export class AIRender {
  renderer: Renderer;
  container: Element;
  currentSpec: Spec | null = null;
  stateStore: StateStore;
  intentEngine: IntentEngine;
  actionEngine: ActionEngine;
  orchestrator: RenderOrchestrator;
  adapter: PlatformAdapter;

  constructor(options: {
    container: Element | string;
    initialSpec?: any | any[];
    enableHistory?: boolean;
    platform?: PlatformAdapter;
  }) {
    this.container = typeof options.container === 'string'
      ? document.querySelector(options.container)!
      : options.container;

    this.renderer = new Renderer(this.container);
    this.stateStore = options.enableHistory !== false ? new StateStore() : new StateStore(1);
    this.intentEngine = new IntentEngine();
    this.actionEngine = new ActionEngine();
    this.orchestrator = new RenderOrchestrator(this.renderer);
    this.adapter = options.platform || createPlatformAdapter(this.container);

    if (options.initialSpec) {
      this.render(options.initialSpec);
    }
  }

  /**
   * 处理用户 Intent
   */
  async processIntent(intent: Intent): Promise<Spec | null> {
    const context: IntentContext = {
      state: this.currentSpec?.state || {},
      history: [],
    };

    const result = await this.intentEngine.process(intent, context);

    if (result.spec) {
      this.render(result.spec);
      return result.spec;
    }

    return null;
  }

  /**
   * 执行动作
   */
  async executeAction(action: ActionSpec): Promise<boolean> {
    const result = await this.actionEngine.execute(action);
    if (result.success && result.nextIntent) {
      // 触发下一个 Intent
      const intent: Intent = {
        type: result.nextIntent,
        confidence: 1.0,
        entities: { previousAction: action },
      };
      await this.processIntent(intent);
    }
    return result.success;
  }

  // ... 保留原有的方法 ...
}
```

- [ ] **Step 2: 提交**

```bash
git add src/index.ts
git commit -m "feat: integrate all modules into unified AIRender API"
```

---

## 架构验证: 运行 TypeScript 编译

**Files:**
- Modify: `tsconfig.json` (如果需要)

- [ ] **Step 1: 验证编译**

```bash
npm run build
```

Expected: 编译成功，无错误

- [ ] **Step 2: 如果有错误，修复后提交**

```bash
git add -A && git commit -m "fix: resolve TypeScript compilation errors"
```

---

## 下一步

完成此计划后，项目将具备:

1. ✅ 完整的 Spec 契约
2. ✅ 状态历史和回溯能力
3. ✅ Intent/Action 引擎抽象
4. ✅ 双路径渲染支持
5. ✅ 平台适配器接口

**未来里程碑:**
- Rust Core 实现 (性能关键路径)
- WASM 编译支持
- Tauri 桌面适配器
- 更多平台支持

---

**Plan complete.** Ready to execute?
