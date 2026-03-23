# AI Render Runtime

> 下一代 AI Native 渲染引擎 - AI 是核心，前端是输出

[English](./README.en.md) | 中文

## 目录

- [核心价值](#核心价值)
- [为什么需要 AI Render](#为什么需要-ai-render)
- [快速开始](#快速开始)
- [架构设计](#架构设计)
- [AI Native 特性](#ai-native-特性)
- [API 参考](#api-参考)
- [安全建议](#安全建议)

---

## 核心价值

**AI Native** - 重新定义前端范式：

```
传统: 前端主导，AI 是工具
     React/Vue ← 调用 AI → AI 输出内容

AI Native: AI 是核心，前端是输出
     AI Runtime → Spec 契约 → 多平台渲染
```

### 与 React/Vue 的区别

| 特性 | React/Vue | AI Render |
|------|-----------|-----------|
| 核心驱动 | 开发者代码 | AI 意图理解 |
| UI 来源 | JSX/模板 | AI 动态生成 |
| 状态管理 | 手动 setState | AI 决策 + 状态快照 |
| 交互处理 | 事件监听器 | Intent Engine |
| 热更新 | 需手动处理 | 内置 `air.update()` |
| 状态历史 | 外部实现 | 内置 Memento |

---

## 为什么需要 AI Render

### 传统 AI + 前端工作流

```
1. AI 返回 JSON（或文本描述）
2. 开发者手工转换为组件代码
3. 编写组件、绑定数据
4. 测试验证
5. 部署
```

**痛点**：每个 AI 响应都需要开发者介入，无法实现真正的 AI 原生应用。

### 使用 AI Render

```
1. AI 理解用户意图
2. AI 生成 Spec 契约
3. AIRender 直接渲染
4. 用户看到结果
```

**优势**：
- 零手工转换
- AI 驱动的动态界面
- 内置状态历史（可回溯）
- 支持流式生成和实时更新

---

## 快速开始

### 安装

```bash
npm install
npm run build
```

### 方式 1: AI 驱动渲染（核心场景）

**关键**：AI 调用应在后端进行，前端只负责渲染。

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   前端      │     │   后端      │     │   AI API    │
│  (AIRender) │◀───│  (API Proxy) │───▶│  (LLM)     │
└─────────────┘     └─────────────┘     └─────────────┘
     渲染              安全转发           生成 UI Spec
```

**前端代码（只负责渲染）**：

```javascript
import { AIRender } from 'ai-render-runtime';

// 只负责渲染 AI 返回的 Spec
const app = new AIRender({
  container: '#app',
  initialSpec: null
});

// 通过后端 API 获取 AI 生成的 Spec
const { spec } = await fetch('/api/generate-ui', {
  method: 'POST',
  body: JSON.stringify({ prompt: '创建一个仪表盘' })
});
app.update(spec);
```

### 方式 2: Intent 驱动交互

**关键**：用户交互触发 Intent，AI 理解后生成新 Spec：

```
用户点击 → Intent Engine → AI 理解意图 → Spec 生成 → 热更新 UI
```

```javascript
import { AIRender, IntentEngine, createSpec } from 'ai-render-runtime';

const app = new AIRender({ container: '#app' });
const intentEngine = new IntentEngine();

// 注册 Intent 处理器
intentEngine.register('show_dashboard', async (intent, context) => {
  const response = await fetch('/api/ai', {
    method: 'POST',
    body: JSON.stringify({
      intent: intent.type,
      entities: intent.entities
    })
  });
  return { spec: await response.json() };
});

// 处理用户交互
app.processIntent({
  type: 'show_dashboard',
  confidence: 1.0,
  entities: { view: 'dashboard' }
});
```

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Targets                          │
├─────────────┬──────────────────┬─────────────────────────────┤
│  SDK/npm    │   Standalone     │      WASM                  │
│  (嵌入)     │   (进程服务)      │   (浏览器/离线)            │
└─────────────┴──────────────────┴─────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 Platform Abstraction Layer                   │
│      窗口管理 | 文件系统 | 网络 | 输入设备抽象                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Rendering Runtime (TS / Rust)                    │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │ Browser     │  │ Desktop     │  │ Mobile      │       │
│   │ (Canvas/DOM)│  │ (Tauri/Native)│ │ (Future)   │       │
│   └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Spec Contract (JSON)                      │
│         版本化契约 • 可传输 • 可存储 • 可重放                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│               AI Native Core Runtime (Rust/TS)               │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│  │  Intent   │  │   Spec    │  │  Action   │              │
│  │  Engine   │──▶│ Generator │──▶│  Engine   │              │
│  └───────────┘  └───────────┘  └───────────┘              │
│        │                │                │                 │
│        ▼                ▼                ▼                 │
│  ┌─────────────────────────────────────────────┐           │
│  │           State Store (Memento Pattern)      │           │
│  │     快照保存 • 状态恢复 • 操作重放           │           │
│  └─────────────────────────────────────────────┘           │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────┐           │
│  │     Render Orchestrator (双路径渲染)         │           │
│  │   标准路径: Spec → UI                       │           │
│  │   快速路径: Intent → 直接渲染               │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

### 核心模块

#### 1. Spec Contract（契约层）

```typescript
interface Spec {
  version: string;           // 契约版本
  intent: string;            // Intent 类型
  view: ViewSpec;           // 视图描述
  actions: ActionSpec[];     // 可用动作
  state: Record<string, any>; // 视图状态
  meta: {
    createdAt: string;     // 创建时间
    confidence: number;     // AI 置信度
    streaming: boolean;      // 是否流式
  };
}

interface ViewSpec {
  type: string;             // dashboard, list, form
  layout?: LayoutSpec;      // 布局信息
  components: ComponentSpec[];
}

interface ActionSpec {
  id: string;
  type: 'navigation' | 'api' | 'mutation' | 'custom';
  payload?: any;
  nextIntent?: string;      // 执行后可能的下一个 Intent
}
```

#### 2. Intent Engine（意图理解）

```typescript
interface Intent {
  type: string;
  confidence: number;
  entities: Record<string, any>;
  raw?: string;
}

// 注册 Intent 处理器
intentEngine.register('show_dashboard', async (intent, context) => {
  // AI 理解意图，返回 Spec
  const spec = await ai.understand(intent);
  return { spec };
});

// 处理 Intent
const result = await intentEngine.process(intent, context);
```

#### 3. State Store（Memento 模式）

```typescript
// 快照保存
const snapshotId = app.saveSnapshot('before_action');

// 状态恢复
app.restore(snapshotId);

// 撤销
app.undo();

// 状态订阅
app.onStateChange((spec) => {
  console.log('State changed:', spec);
});

// 获取历史
const history = app.getHistory();
```

#### 4. Render Orchestrator（双路径渲染）

```
路径 1: 标准路径（复杂界面、跨平台）
  Intent → Spec → Rendering Runtime → UI

路径 2: 快速路径（实时交互、流式输出）
  Intent → Render Orchestrator → UI
```

---

## AI Native 特性

### 1. Intent 驱动的 UI

AI 理解用户意图，动态生成界面：

```javascript
// 用户说"显示销售仪表盘"
app.processIntent({
  type: 'show_dashboard',
  confidence: 0.95,
  entities: { metric: 'sales', period: 'monthly' }
});

// AI 返回对应的 Spec，自动渲染
```

### 2. 状态历史与回溯

Memento Pattern 支持完整的操作历史：

```javascript
// 每个操作自动保存快照
app.saveSnapshot();

// 查看历史
const history = app.getHistory();
history.forEach(s => console.log(s.meta.createdAt));

// 恢复到任意历史点
app.restore(history[0].id);

// 撤销
app.undo();
```

### 3. 流式渲染

实时显示 AI 生成过程：

```javascript
const stream = createAIStream(config);

stream.onUpdate(state => {
  progressBar.value = state.progress;
  if (state.currentSpec) {
    app.update(state.currentSpec);
  }
});

for await (const state of stream.generate('创建仪表盘')) {
  // 实时看到 UI 生成过程
}
```

### 4. Action 执行与链式 Intent

```javascript
// Spec 中定义动作
const spec = {
  actions: [
    {
      id: 'navigate_settings',
      type: 'navigation',
      nextIntent: 'show_settings'
    }
  ]
};

// 执行动作，自动触发下一个 Intent
await app.executeAction(spec.actions[0]);
```

### 5. 平台适配

统一的平台抽象接口：

```javascript
import { createPlatformAdapter } from 'ai-render-runtime';

// 浏览器
const browserAdapter = createPlatformAdapter('#app', 'browser');

// Tauri (未来)
const tauriAdapter = createPlatformAdapter('#app', 'tauri');
```

---

## API 参考

### AIRender

```typescript
const app = new AIRender({
  container: '#app',
  initialSpec: specs,
  enableHistory: true  // 默认开启
});

// 渲染
app.render(spec);
app.update(spec);  // 热更新

// Intent 处理
app.processIntent(intent);  // → Promise<Spec>

// Action 执行
app.executeAction(action);  // → Promise<boolean>

// 状态历史
app.saveSnapshot(label?);   // → snapshotId
app.restore(snapshotId);    // → boolean
app.undo();                 // → boolean
app.getHistory();           // → Snapshot[]
app.onStateChange(callback); // → unsubscribe fn

// 获取当前 Spec
app.getSpec();

// 销毁
app.destroy();
```

### IntentEngine

```typescript
const engine = new IntentEngine();

// 注册 Intent 处理器
engine.register('show_dashboard', async (intent, context) => {
  return { spec: generatedSpec };
});

// 设置默认处理器
engine.setDefaultHandler(async (intent, context) => {
  return { spec: await ai.understand(intent) };
});

// 处理
const result = await engine.process(intent, context);

// 查询
engine.getRegisteredIntents();
```

### ActionEngine

```typescript
const actionEngine = new ActionEngine();

// 注册动作处理器
actionEngine.register('api', async (payload) => {
  return await fetch(payload.endpoint, payload.options);
});

// 执行
const result = await actionEngine.execute({
  id: 'fetch_data',
  type: 'api',
  payload: { endpoint: '/api/data' }
});

// 批量执行
const results = await actionEngine.executeBatch(actions);
```

### StateStore

```typescript
const store = new StateStore(maxHistory = 50);

store.getState();           // → Spec | null
store.setState(spec);
store.saveSnapshot(label?);
store.restore(snapshotId);
store.getSnapshot(id);
store.getHistory();
store.undo();
store.subscribe(callback);  // → unsubscribe
store.clear();
```

### RenderOrchestrator

```typescript
const orch = new RenderOrchestrator(renderer);

// 设置渲染模式
orch.setMode('standard');  // 或 'fast'

// 标准路径：渲染 Spec
orch.renderSpec(spec);

// 快速路径：直接补丁
orch.patch({ type: 'style', path: ['color'], value: 'red' });

// 流式更新
orch.stream({ view: { type: 'partial' } });

// 切换路径
orch.useStandardPath(spec);
```

### PlatformAdapter

```typescript
interface PlatformAdapter {
  platform: 'browser' | 'tauri' | 'node' | 'mobile';
  render(spec: Spec): void;
  destroy(): void;
  readClipboard(): Promise<string>;
  writeClipboard(text: Promise<void>);
  showNotification(title: string, body: string): Promise<void>;
  onReady(callback: () => void): void;
  onDestroy(callback: () => void): void;
}

// 创建适配器
const adapter = createPlatformAdapter(container, 'browser');
```

### createAIStream

```typescript
const stream = createAIStream({
  apiKey: 'your-key',
  apiUrl: '...',
  model: '...'
});

stream.onUpdate(state => {
  // state.isGenerating, state.progress, state.currentSpec
});

for await (const state of stream.generate('创建仪表盘')) {
  app.update(state.currentSpec);
}

const spec = await stream.generateOnce('创建表单');
stream.clearHistory();
```

---

## 安全建议

### 正确架构：后端代理

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   前端      │     │   后端      │     │   AI API    │
│  (AIRender) │◀───│  (API Proxy) │───▶│  (LLM)     │
│             │     │             │     │             │
│ API Key: ✗ │     │ API Key: ✓  │     │ AI 返回    │
└─────────────┘     └─────────────┘     └─────────────┘
```

| 做法 | 说明 |
|------|------|
| API Key 后端存储 | 永远不要把 Key 放在前端代码 |
| 限制 API Key 权限 | 只给需要的 API 权限 |
| 请求频率限制 | 防止滥用 |
| 使用代理 | 隐藏真实 AI API 地址 |

---

## 浏览器支持

现代浏览器（ES2020+）

## 安装

```bash
npm install
npm run build
```

## 许可证

MIT
