# AI Native Runtime 架构设计

> **目标:** 设计一个 AI Native 的运行时引擎，AI 是核心，渲染只是输出之一

## 核心理念

传统前端架构：**前端主导，AI 是工具**
```
前端框架(React/Vue) ← 调用 AI → AI 输出内容
```

AI Native 架构：**AI 是核心，前端是输出**
```
AI Runtime (核心) → 生成 Spec → 多平台渲染
```

**关键转变**: 前端从"管理 UI 状态"变成"渲染 AI 给的 Spec"，Spec 是 AI 和 Runtime 之间的唯一契约。

---

## 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Deployment Targets                     │
├─────────────┬──────────────────┬───────────────────────┤
│  SDK/npm    │   Standalone     │      WASM             │
│  (嵌入)     │   (进程服务)      │   (浏览器/离线)        │
└─────────────┴──────────────────┴───────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Platform Abstraction Layer               │
│      窗口管理 | 文件系统 | 网络 | 输入设备抽象            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Rendering Runtime (TS / Rust)               │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│   │ Browser     │  │ Desktop     │  │ Mobile      │ │
│   │ (Canvas/DOM)│  │ (Tauri/Native)│ │ (Future)   │ │
│   └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Spec Contract (JSON)                  │
│         版本化契约 • 可传输 • 可存储 • 可重放             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│               AI Native Core Runtime (Rust)              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐        │
│  │  Intent   │  │   Spec    │  │  Action   │        │
│  │  Engine   │──▶│ Generator │──▶│  Engine   │        │
│  └───────────┘  └───────────┘  └───────────┘        │
│        │                │                │             │
│        ▼                ▼                ▼             │
│  ┌─────────────────────────────────────────────┐      │
│  │           State Store (Memento Pattern)     │      │
│  └─────────────────────────────────────────────┘      │
│                          │                             │
│                          ▼                             │
│  ┌─────────────────────────────────────────────┐      │
│  │     Render Orchestrator (紧耦合路径)        │      │
│  │   AI 理解 → 直接微调渲染，无需完整 Spec      │      │
│  └─────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

---

## 核心模块

### 1. Intent Engine (意图理解)

**职责**: 理解用户输入（文本、语音、行为），转化为结构化意图

**输入**: 用户原始输入（自然语言、点击、 gesture 等）
**输出**: 结构化 Intent 对象

```typescript
interface Intent {
  type: string;           // intent 类型
  confidence: number;     // 置信度 0-1
  entities: Record<string, any>;  // 提取的实体
  context: Context;       // 当前上下文
  raw?: string;           // 原始输入
}
```

**关键能力**:
- 多模态输入理解
- 上下文关联
- 置信度评估

---

### 2. Spec Generator (Spec 生成器)

**职责**: 将 Intent 转化为 Spec 契约

**输入**: Intent
**输出**: Spec (JSON)

```typescript
interface Spec {
  version: string;        // 契约版本
  intent: string;         // 对应的 intent type
  view: ViewSpec;         // 视图描述
  actions: ActionSpec[];  // 可用动作
  state: Record<string, any>;  // 视图状态
  meta: {
    createdAt: string;
    confidence: number;
    streaming: boolean;
  };
}
```

**关键能力**:
- 流式 Spec 生成（用于流式 UI 更新）
- Spec 版本兼容性
- 增量更新（patch）

---

### 3. Action Engine (动作执行引擎)

**职责**: 执行 Spec 中定义的动作，更新状态

**输入**: ActionSpec
**输出**: 执行结果 + 状态更新

```typescript
interface ActionSpec {
  id: string;
  type: 'navigation' | 'api' | 'mutation' | 'custom';
  payload: any;
  nextIntent?: string;  // 执行后可能的下一个 Intent
}
```

**关键能力**:
- 异步动作执行
- 动作队列
- 失败重试
- 乐观更新

---

### 4. State Store (状态存储 - Memento Pattern)

**职责**: 管理应用状态，支持回溯

```typescript
interface StateStore {
  // 获取当前状态
  getState(): AppState;

  // 保存快照
  saveSnapshot(): string;  // 返回 snapshot ID

  // 恢复到某个快照
  restore(snapshotId: string): void;

  // 状态历史
  getHistory(): Snapshot[];

  // 订阅状态变化
  subscribe(callback: (state: AppState) => void): () => void;
}
```

**关键能力**:
- 时间旅行调试
- 操作重放
- AI 训练数据生成

---

### 5. Render Orchestrator (渲染编排器)

**职责**: AI 直接控制渲染的快速路径

**两种渲染模式**:

**模式 A: 标准路径 (Spec 契约)**
```
Intent → Spec → Rendering Runtime → UI
```
用于：复杂界面、跨平台、状态重放、测试

**模式 B: 快速路径 (紧耦合)**
```
Intent → Render Orchestrator → UI
```
用于：实时交互、流式输出、精细动画

```typescript
interface RenderOrchestrator {
  // 直接微调渲染
  patch(patch: RenderPatch): void;

  // 流式更新
  stream(partialSpec: Partial<Spec>): void;

  // 切换到标准路径
  useStandardPath(): void;
}
```

---

## Spec 契约详解

### ViewSpec 示例

```json
{
  "version": "1.0",
  "intent": "show_user_dashboard",
  "view": {
    "type": "dashboard",
    "layout": {
      "type": "grid",
      "columns": 3,
      "rows": 2,
      "gap": 16
    },
    "components": [
      {
        "id": "header",
        "type": "text",
        "content": "Welcome back!"
      },
      {
        "id": "stats",
        "type": "card",
        "children": [...]
      }
    ]
  },
  "actions": [
    { "id": "refresh", "type": "api", "endpoint": "/api/stats" },
    { "id": "navigate", "type": "navigation", "target": "/settings" }
  ],
  "state": {
    "activeTab": "overview",
    "filters": {}
  },
  "meta": {
    "createdAt": "2026-03-24T03:00:00Z",
    "confidence": 0.95,
    "streaming": false
  }
}
```

---

## 部署模式

### 模式 1: SDK 嵌入

```javascript
// npm 包形式
import { AIRuntime } from '@ai-native/runtime';

const runtime = new AIRuntime({
  adapter: 'browser',  // 或 'tauri', 'react-native'
});

runtime.start();
```

适用场景：集成到现有应用

### 模式 2: Standalone 进程

```
┌──────────────────┐
│   AI Runtime     │
│   (Rust 进程)    │
├──────────────────┤
│  WebSocket API   │
│  HTTP API        │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│  渲染客户端      │
│  (TS/Browser)   │
└──────────────────┘
```

适用场景：需要强安全隔离、高性能 AI 推理

### 模式 3: WASM 浏览器内运行

```javascript
// WASM 模块
import init, { AIRuntime } from './pkg/ai_runtime.wasm';

await init();
const runtime = new AIRuntime();
runtime.start();
```

适用场景：离线优先、隐私敏感

---

## 技术选型

### 混合架构

| 层级 | 技术 | 理由 |
|------|------|------|
| AI Core | Rust | 性能最优、WASM 友好 |
| Platform Bindings | TypeScript | 快速迭代、丰富生态 |
| Rendering | TypeScript + Rust | 根据场景选择 |
| Spec Contract | JSON Schema | 跨语言、版本化 |

### Rust 核心模块

```
ai-native-core/
├── intent-engine/     # 意图理解
├── spec-generator/    # Spec 生成
├── action-engine/     # 动作执行
├── state-store/       # 状态管理
└── render-orch/       # 渲染编排
```

### TypeScript 绑定

```
bindings/typescript/
├── core/              # Rust core 的 TS 绑定
├── adapters/
│   ├── browser/       # DOM 渲染适配器
│   ├── canvas/        # Canvas 渲染适配器
│   └── tauri/         # Tauri 桌面适配器
└── index.ts
```

---

## 渲染适配器接口

```typescript
interface PlatformAdapter {
  // 平台标识
  platform: 'browser' | 'tauri' | 'mobile';

  // 渲染能力
  render(spec: Spec): void;
  patch(patch: RenderPatch): void;
  destroy(): void;

  // 平台能力
  readClipboard(): Promise<string>;
  writeClipboard(text: string): Promise<void>;
  showNotification(title: string, body: string): Promise<void>;
  // ... 其他平台能力

  // 生命周期
  onReady(callback: () => void): void;
  onDestroy(callback: () => void): void;
}
```

---

## 状态历史与回溯

```
用户操作序列:
[A] → [B] → [C] → [D] → [E]
                      ↑
              AI 判断应该回退到 C

State Store:
snapshots: {
  A: { view: {...}, state: {...} },
  B: { view: {...}, state: {...} },
  C: { view: {...}, state: {...} },
  D: { view: {...}, state: {...} },
  E: { view: {...}, state: {...} }
}

restore('C') → Spec C → 重新渲染
```

---

## 安全性考虑

### 沙箱执行

```
┌─────────────────────────────────┐
│         AI Runtime              │
│  ┌───────────────────────────┐  │
│  │   Spec Validation Layer   │  │
│  │   (Schema 校验)            │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │   Permission System       │  │
│  │   (白名单操作)             │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Spec 校验

- 必须校验所有 Spec 的 schema
- 可疑的 action 需要用户确认
- 网络请求必须通过明确定义的 API

---

## 下一步

1. **原型阶段**: TypeScript 实现核心模块，验证架构
2. **核心替换**: Rust 重写性能关键路径
3. **平台适配**: 完善各平台适配器
4. **生态建设**: 文档、示例、工具链
