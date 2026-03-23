# AI Render Runtime

> 将 AI 生成的结构化数据直接渲染为 UI 组件的引擎

[English](./README.en.md) | 中文

## 目录

- [核心价值](#核心价值)
- [为什么需要 AI Render](#为什么需要-ai-render)
- [快速开始](#快速开始)
- [架构设计](#架构设计)
- [AI Native 特性](#ai-native-特性)
- [API 参考](#api-参考)
- [安全建议](#安全建议)
- [核心概念](#核心概念)

---

## 核心价值

**AI Native** - 不是另一个 React，而是专为 AI 设计的渲染引擎：

```
AI 输出 JSON → AIRender.render() → 高性能 UI
```

### 与 React/Vue 的区别

| 特性 | React/Vue | AI Render |
|------|-----------|-----------|
| 核心输入 | JSX/模板 | AI JSON Spec |
| 状态来源 | 开发者定义 | AI 动态生成 |
| 更新方式 | 手动 setState | AI 输出自动渲染 |
| 热更新 | 需手动处理 | 内置 `air.update()` |
| AI 集成 | 外部实现 | 内置适配器 |

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
1. AI 返回 JSON
2. AIRender.render() 直接渲染
3. 用户看到结果
```

**优势**：
- 零手工转换
- 实时渲染 AI 输出
- 内置热更新
- 支持流式生成

---

## 快速开始

### 安装

```bash
npm install
npm run build
```

### 方式 1: AI 驱动渲染（核心场景）

**关键**：AI 调用应在后端进行，前端只负责渲染。以下是正确的集成模式：

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
  initialSpec: null  // 初始为空，等待后端返回
});

// 通过后端 API 获取 AI 生成的 Spec
async function fetchAISpec(prompt) {
  // 注意：API 调用在后端，前端只请求自己的服务
  const response = await fetch('/api/generate-ui', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return response.json();  // 返回 { spec: {...} }
}

// 使用
const { spec } = await fetchAISpec('创建一个登录表单');
app.update(spec);
```

**后端代码示例（Node.js）**：

```javascript
// server.js - 安全的 API 代理
const express = require('express');
const { callAI } = require('ai-render-runtime');

const app = express();
app.use(express.json());

app.post('/api/generate-ui', async (req, res) => {
  const { prompt } = req.body;

  try {
    // API Key 只在后端使用，绝不暴露给前端
    const response = await callAI('openai', {
      apiKey: process.env.OPENAI_API_KEY,  // 环境变量
      model: 'gpt-4'
    }, prompt);

    const spec = JSON.parse(response.content);
    res.json({ spec });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

### 方式 2: 使用内置 AI 生成器（仅开发/演示）

如果你的 AI API 支持 CORS 或你使用代理，可以直接使用内置生成器：

```javascript
import { createAIGen } from 'ai-render-runtime';

const gen = createAIGen({
  container: '#app',
  apiKey: 'your-api-key',  // 仅用于演示，不推荐生产环境
  provider: 'openai',
  apiUrl: '/api/proxy',  // 指向你的后端代理
  model: 'gpt-4'
});

// 生成并渲染
await gen.generate('创建一个仪表盘');
```

### 方式 3: Intent 路由 + AI 理解

**关键**：Intent 路由让你的 AI UI 具备交互能力：

```
用户点击按钮 → Intent 触发 → 后端 AI 理解意图 → 返回新 Spec → 热更新 UI
```

```javascript
import { createIntentRouter, AIRender } from 'ai-render-runtime';

// 1. 创建渲染器
const app = new AIRender({ container: '#app' });

// 2. 创建 Intent 路由
const router = createIntentRouter();

// 3. 注册 Intent 处理器（指向你的后端 AI 服务）
router.register('onClick', async (payload) => {
  // 发送到后端，后端调用 AI 理解意图
  const response = await fetch('/api/ai-understand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'click',
      element: payload.id,
      context: payload
    })
  });
  return response.json();  // 返回 { spec: {...} } 或 { command: '...' }
});

router.register('onSubmit', async (payload) => {
  const response = await fetch('/api/ai-understand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'submit',
      formData: payload,
      context: 'login_form'
    })
  });
  return response.json();
});

// 4. 初始渲染（后端返回第一个 AI UI）
const { spec } = await fetch('/api/ai-initial');
app.update(spec);

// 5. 绑定 Intent 到 AI 生成的 UI
// 假设 AI 返回的按钮有 data-intent="onClick" 属性
document.addEventListener('click', async (e) => {
  const intentElement = e.target.closest('[data-intent]');
  if (intentElement) {
    const intentName = intentElement.dataset.intent;
    const payload = { id: intentElement.id, value: intentElement.value };

    const result = await router.handle(intentName, payload);

    // 如果返回新 Spec，热更新 UI
    if (result && result.spec) {
      app.update(result.spec);
    }
  }
});
```

**后端 AI 理解服务**：

```javascript
// server.js - AI 理解服务
app.post('/api/ai-understand', async (req, res) => {
  const { action, element, context } = req.body;

  // 构造提示词，让 AI 决定下一步 UI
  const prompt = `
    用户在 AI 生成的 UI 上执行了操作：
    - 操作类型: ${action}
    - 元素: ${element}
    - 上下文: ${JSON.stringify(context)}

    根据用户意图，返回下一个 UI 的 JSON Spec。
    如果用户要填写表单，返回带输入值的表单。
    如果用户点击了按钮，返回按钮点击后的结果 UI。
  `;

  const response = await callAI('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  }, prompt);

  try {
    const spec = JSON.parse(response.content);
    res.json({ spec });
  } catch {
    res.status(500).json({ error: 'Failed to parse AI response' });
  }
});
```

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Render Runtime                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │ AI Adapter │───▶│   Parser   │───▶│  AIRender       │ │
│  └─────────────┘    └─────────────┘    │                 │ │
│                                          │  ┌───────────┐ │ │
│  ┌─────────────┐    ┌─────────────┐      │  │ Registry  │ │ │
│  │ AIStream   │───▶│ Spec JSON  │──────▶│  └─────┬─────┘ │ │
│  └─────────────┘    └─────────────┘      │        │       │ │
│                                          │        ▼       │ │
│  ┌─────────────┐    ┌─────────────┐      │  ┌─────────┐  │ │
│  │IntentRouter│◀───│  Events    │◀─────│  │Renderer │  │ │
│  └─────────────┘    └─────────────┘      │  └───┬─────┘  │ │
│                                          │      │         │ │
│                                          └──────┼─────────┘ │
│                                                 │          │
│  ┌─────────────────────────────────────────────┼──────────┤
│  │                  Core Engine                │          │
│  ├─────────────────────────────────────────────┼──────────┤
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐   │          │
│  │  │ Signal  │  │  VDOM   │  │  Diff   │   │          │
│  │  │(响应式) │  │(虚拟DOM) │  │(差异)   │   │          │
│  │  └─────────┘  └─────────┘  └─────────┘   │          │
│  │                                             │          │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐   │          │
│  │  │Lifecycle │  │ Context │  │  Memo   │   │          │
│  │  │(生命周期)│  │(上下文) │  │(记忆化) │   │          │
│  │  └─────────┘  └─────────┘  └─────────┘   │          │
│  └─────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

### 核心模块

#### 1. AI Adapter Layer（AI 适配层）

```
┌─────────────────────────────────────────┐
│            AI Adapter                     │
├─────────────────────────────────────────┤
│                                         │
│  callAI(provider, config, prompt)       │
│       │                                 │
│       ├──▶ MiniMax Adapter             │
│       ├──▶ OpenAI Adapter              │
│       └──▶ Anthropic Adapter            │
│                                         │
│  parseAIResponse(content)               │
│       │                                 │
│       └──▶ JSON Extractor              │
│              - markdown 代码块提取       │
│              - 括号范围提取             │
│              - 容错解析                 │
│                                         │
└─────────────────────────────────────────┘
```

#### 2. Registry（组件注册表）

```
┌─────────────────────────────────────────┐
│         ComponentRegistry                 │
├─────────────────────────────────────────┤
│                                         │
│  register(type, renderFn)              │
│       │                                 │
│       ├──▶ 'card'     → CardRenderer   │
│       ├──▶ 'form'     → FormRenderer   │
│       ├──▶ 'input'    → InputRenderer  │
│       ├──▶ 'button'   → ButtonRenderer │
│       ├──▶ 'list'     → ListRenderer   │
│       ├──▶ 'alert'    → AlertRenderer  │
│       ├──▶ 'stats'    → StatsRenderer  │
│       ├──▶ 'profile'  → ProfileRender │
│       └──▶ 'buttonGroup' → ...         │
│                                         │
│  render(spec) → VNode                  │
│       │                                 │
│       └──▶ 递归渲染子组件              │
│                                         │
└─────────────────────────────────────────┘
```

#### 3. Renderer（渲染器）

```
┌─────────────────────────────────────────┐
│              Renderer                     │
├─────────────────────────────────────────┤
│                                         │
│  createDom(vnode) → DOM               │
│       │                                 │
│       ├──▶ Text Node                   │
│       ├──▶ Element                     │
│       ├──▶ Component ──▶ createDom()   │
│       └──▶ Fragment                    │
│                                         │
│  patch(parent, newVNode, oldVNode)    │
│       │                                 │
│       ├──▶ updateProps                │
│       ├──▶ updateChildren            │
│       │     ├──▶ diffChildrenKeyed()   │
│       │     └──▶ diffChildren()       │
│       └──▶ applyPatches()             │
│                                         │
│  hydrate(dom, vnode)                  │
│       │                                 │
│       └──▶ SSR 复用已有 DOM            │
│                                         │
└─────────────────────────────────────────┘
```

#### 4. Signal（响应式系统）

```
┌─────────────────────────────────────────┐
│            Signal (响应式)                │
├─────────────────────────────────────────┤
│                                         │
│  createSignal(initial)                  │
│       │                                 │
│       └──▶ [getter, setter]           │
│                                         │
│  Signal.get()                          │
│       │                                 │
│       └──▶ 收集当前订阅者              │
│                                         │
│  Signal.set(newValue)                  │
│       │                                 │
│       └──▶ 通知所有订阅者             │
│             └──▶ batch() 批量更新       │
│                                         │
│  createEffect(fn)                      │
│       │                                 │
│       └──▶ 自动追踪依赖               │
│             └──▶ WeakMap 防止内存泄漏   │
│                                         │
└─────────────────────────────────────────┘
```

#### 5. Diff 算法

```
┌─────────────────────────────────────────┐
│         O(n) Keyed Diff                │
├─────────────────────────────────────────┤
│                                         │
│  diffChildrenKeyed(new, old)           │
│       │                                 │
│       ├──▶ 按 key 建立 Map             │
│       │     ├──▶ newKeyed: Map        │
│       │     └──▶ oldKeyed: Map        │
│       │                                 │
│       ├──▶ 第一遍：顺序扫描            │
│       │     ├──▶ 新增 → INSERT        │
│       │     ├──▶ 匹配 → 递归 diff     │
│       │     └──▶ 乱序 → MOVE          │
│       │                                 │
│       └──▶ 第二遍：删除检测            │
│             └──▶ 剩余旧节点 → REMOVE   │
│                                         │
│  PatchType: REPLACE | REMOVE | INSERT │
│              UPDATE | MOVE | TEXT       │
│                                         │
└─────────────────────────────────────────┘
```

#### 6. VNode 结构

```
┌─────────────────────────────────────────┐
│              VNode                         │
├─────────────────────────────────────────┤
│                                         │
│  interface VNode {                      │
│    type: string | Component            │
│    props: VNodeProps                  │
│    children: (VNode | string)[]       │
│    key?: string | number               │
│    flags: VNodeFlags                   │
│    patchFlag?: PatchFlags  // 优化    │
│  }                                     │
│                                         │
│  enum VNodeFlags {                    │
│    Element = 1,                       │
│    Text = 2,                          │
│    Component = 4,                     │
│    Fragment = 8                       │
│  }                                     │
│                                         │
│  enum PatchFlags {                    │
│    TEXT = 1,    // 仅文本变化         │
│    CLASS = 2,   // 仅 class 变化      │
│    STYLE = 4,   // 仅 style 变化      │
│    PROPS = 8,   // 其他 props 变化   │
│    FULL = 16    // 完整 diff          │
│  }                                     │
│                                         │
└─────────────────────────────────────────┘
```

---

## AI Native 特性

### 1. Spec 驱动渲染

AI 返回标准化 JSON，自动映射到组件：

```json
{
  "type": "form",
  "children": [
    { "type": "input", "label": "用户名", "placeholder": "请输入" },
    { "type": "input", "type": "password", "label": "密码" },
    { "type": "button", "label": "登录", "variant": "primary" }
  ]
}
```

渲染结果：

```
┌─────────────────────────────────┐
│  ┌───────────────────────────┐  │
│  │ 用户名                   │  │
│  │ [________________]        │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 密码                     │  │
│  │ [________________]        │  │
│  └───────────────────────────┘  │
│        [登录]                    │
└─────────────────────────────────┘
```

### 2. 流式渲染

实时显示 AI 生成过程：

```javascript
const stream = createAIStream(config);

// 状态
interface AIStreamState {
  isGenerating: boolean;   // 是否正在生成
  progress: number;       // 进度 0-100
  currentSpec: Spec;      // 当前解析的 Spec
  history: Spec[];        // 历史记录
  error: string | null;  // 错误信息
}

// 监听
stream.onUpdate(state => {
  progressBar.value = state.progress;
  if (state.currentSpec) {
    render(state.currentSpec); // 增量渲染
  }
});

// 生成
for await (const state of stream.generate('创建一个仪表盘')) {
  // 实时看到 AI 生成 UI 的过程
}
```

### 3. Intent 路由

AI UI 交互自动触发 AI 理解：

```javascript
const router = createIntentRouter();

// 注册 Intent 处理器
router.register('onSubmit', async (data) => {
  // 返回 AI 对这个提交的理解
  return await ai.understand('form_submit', data);
});

router.register('onClick', async ({ id, action }) => {
  return await ai.understand('click', { id, action });
});

// 使用
const spec = await ai.generate('创建一个有表单的页面');
render(spec);

// 之后，AI 生成的 UI 会自动与 router 关联
document.querySelector('button').onclick = () => {
  router.handle('onClick', { id: 'submit-btn', action: 'login' });
};
```

### 4. 热更新

```javascript
const app = new AIRender({ container: '#app', initialSpec });

// 全量更新
app.update(newSpecs);

// 或获取当前 Spec 进行修改
const current = app.getSpec();
app.update(modifiedSpec);
```

### 5. 自定义组件

```javascript
// 注册自定义组件
app.register('myComponent', (spec, render) => {
  return h('div', { class: 'my-component' },
    h('span', null, spec.text),
    ...spec.children.map(c => render(c))
  );
});

// AI 可以使用这个组件
const spec = {
  type: 'myComponent',
  text: 'Hello',
  children: [...]
};
```

---

## 安全建议

### 问题：前端暴露 API Key 不安全

```
❌ 错误做法：
  前端直接调用 AI API，API Key 暴露在浏览器中
  ↓
  用户可以通过 F12 看到 API Key
  ↓
  任何人可以刷你的 API 额度
```

### 正确架构：后端代理

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   前端      │     │   后端      │     │   AI API    │
│  (AIRender) │     │  (API Proxy) │     │  (LLM)     │
│             │     │             │     │             │
│ API Key: ✗ │     │ API Key: ✓  │     │             │
│  只渲染     │◀───▶│  安全转发   │───▶│  AI 返回    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 实现建议

#### 1. 后端代理（推荐）

```javascript
// 后端 - 安全转发 AI 请求
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;

  // API Key 只在服务器端使用
  const response = await callAI('openai', {
    apiKey: process.env.OPENAI_API_KEY
  }, prompt);

  res.json({ spec: parseAIResponse(response.content) });
});
```

#### 2. Vite 代理开发

```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/api/ai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, '/v1/chat/completions'),
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    }
  }
};
```

#### 3. 环境变量

```bash
# .env (不要提交到 Git)
OPENAI_API_KEY=sk-xxx
MINIMAX_API_KEY=xxx
```

```javascript
// 使用时
const response = await fetch('/api/ai', {
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`
  }
});
```

### 最佳实践

| 做法 | 说明 |
|------|------|
| API Key 后端存储 | 永远不要把 Key 放在前端代码 |
| 限制 API Key 权限 | 只给需要的 API 权限 |
| 请求频率限制 | 防止滥用 |
| 使用代理 | 隐藏真实 AI API 地址 |
| 监控异常 | 发现异常调用及时告警 |

---

## API 参考

### AI Native 核心

#### AIRender

```typescript
// 创建实例
const app = new AIRender({
  container: '#app',
  initialSpec: specs  // 可选
});

// 渲染 Spec
app.render(specs);
app.update(specs);  // 热更新

// 注册自定义组件
app.register('myComponent', (spec, render) => VNode);

// 获取当前 Spec
app.getSpec();

// 销毁
app.destroy();
```

#### createAIGen

```typescript
// 创建 AI 生成器（需要后端代理支持 CORS）
const gen = createAIGen({
  container: '#app',
  apiKey: 'your-key',
  provider: 'minimax',
  model: 'M2-her'
});

// 生成
await gen.generate('创建一个登录表单');
```

#### createAIStream

```typescript
// 创建流式生成器
const stream = createAIStream({
  apiKey: 'your-key',
  apiUrl: '...',
  model: '...'
});

// 监听状态
stream.onUpdate(state => {
  console.log(state.progress, state.currentSpec);
});

// 流式生成
for await (const state of stream.generate('创建仪表盘')) {
  render(state.currentSpec);
});

// 非流式
const spec = await stream.generateOnce('创建表单');

// 状态管理
stream.getState();       // 当前状态
stream.getHistory();     // 历史
stream.clearHistory();    // 清空
```

#### IntentRouter

```typescript
const router = createIntentRouter();

// 注册
router.register('onSubmit', async (data) => {
  return await ai.understand('submit', data);
});

// 处理
const result = await router.handle('onSubmit', formData);

// 查询
router.getIntents();  // ['onSubmit', ...]
```

#### registry

```typescript
// 直接渲染
const vnode = registry.render(spec);

// 注册组件
registry.register('myComponent', (spec, render) => VNode);

// 获取
const renderer = registry.get('button');
```

### 响应式

#### createSignal

```typescript
const [count, setCount] = createSignal(0);
count();        // 读取
setCount(1);   // 设置
setCount(c => c + 1);  // 更新
```

#### reactive

```typescript
const state = reactive({
  name: 'AI',
  items: []
});

state.name;           // 自动追踪
state.items.push(1);  // 深层响应
```

#### computed

```typescript
const doubled = computed(() => count() * 2);
```

#### watch / watchEffect

```typescript
watch(() => count(), (newVal, oldVal) => {
  console.log(`${oldVal} → ${newVal}`);
});

watchEffect(() => {
  console.log('Count changed:', count());
});
```

### 组件

#### memo / useMemo / useCallback

```typescript
const Memoized = memo(Component, (prev, next) => {
  return prev.id === next.id;  // 自定义比较
});

const value = useMemo(() => expensive(), [dep]);
const fn = useCallback(() => doSomething(a), [a]);
```

#### ref / useRef

```typescript
const ref = useRef<HTMLInputElement>();
ref.current.focus();
```

#### forwardRef

```typescript
const ForwardedInput = forwardRef((props, ref) => {
  return h('input', { ref });
});
```

### 生命周期

```typescript
onMounted(() => { /* DOM 已挂载 */ });
onUpdated(() => { /* DOM 已更新 */ });
onUnmounted(() => { /* DOM 即将卸载 */ });
onBeforeMount(() => { /* 挂载前 */ });
onBeforeUpdate(() => { /* 更新前 */ });
onBeforeUnmount(() => { /* 卸载前 */ });
```

### 上下文

```typescript
const ThemeContext = createContext('light');

function ThemedButton() {
  const theme = useContext(ThemeContext);
  return h('button', { class: theme }, 'Click');
}

// Provide
provide(ThemeContext, 'dark');

// Inject
const theme = inject(ThemeContext);
```

---

## 核心概念

### Spec

AI 生成的标准化 UI 描述：

```typescript
interface Spec {
  type: string;           // 组件类型
  [key: string]: any;    // 组件属性
}
```

### VNode

虚拟节点，描述 UI 的纯数据结构：

```typescript
interface VNode {
  type: string | Component;
  props: Record<string, any>;
  children: (VNode | string)[];
  key?: string | number;
  flags: VNodeFlags;
}
```

### Signal

响应式数据容器，值变化时自动通知订阅者：

```typescript
const [value, setValue] = createSignal(initial);
// 或
const signal = new Signal(initial);
signal.get();   // 读取
signal.set(1);  // 写入
```

### Registry

组件注册表，将 Spec type 映射到渲染函数：

```typescript
registry.register('card', (spec, render) => {
  return h('div', { class: 'card' },
    spec.children?.map(c => render(c))
  );
});
```

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

## 贡献

欢迎提交 Issue 和 Pull Request！
