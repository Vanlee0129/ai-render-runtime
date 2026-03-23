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

```javascript
import { AIRender } from 'ai-render-runtime';

// AI 生成的结构化数据
const specs = [
  {
    type: 'card',
    title: '销售报表',
    children: [
      { type: 'stats', label: '今日收入', value: '¥12,345' },
      { type: 'stats', label: '订单数', value: '89' }
    ]
  }
];

// 直接渲染 AI 输出
const app = new AIRender({
  container: '#app',
  initialSpec: specs
});

// AI 返回新数据时，热更新 UI
app.update(newSpecsFromAI);
```

### 方式 2: 流式生成

```javascript
import { createAIStream } from 'ai-render-runtime';

const stream = createAIStream({ apiKey: 'your-key' });

// 实时监听 AI 生成状态
stream.onUpdate(state => {
  console.log(`生成进度: ${state.progress}%`);
  if (state.currentSpec) {
    render(state.currentSpec); // 实时渲染
  }
});

// 启动流式生成
for await (const state of stream.generate('创建一个登录表单')) {
  // 增量渲染 AI 输出
}
```

### 方式 3: Intent 路由

```javascript
import { createIntentRouter } from 'ai-render-runtime';

const router = createIntentRouter();

// 注册交互处理器
router.register('onSubmit', async (data) => {
  // AI 理解提交的数据
  return await ai.understand('用户提交了登录表单', data);
});

router.register('onClick', async (buttonId) => {
  return await ai.understand(`用户点击了 ${buttonId} 按钮`);
});

// 绑定到 AI 生成的 UI
button.addEventListener('click', () => {
  router.handle('onClick', 'login-btn');
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
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐    │          │
│  │  │ Signal  │  │  VDOM   │  │  Diff  │    │          │
│  │  │(响应式) │  │(虚拟DOM) │  │(差异)  │    │          │
│  │  └─────────┘  └─────────┘  └─────────┘    │          │
│  │                                              │          │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐    │          │
│  │  │Lifecycle │  │ Context │  │  Memo  │    │          │
│  │  │(生命周期)│  │(上下文) │  │(记忆化)│    │          │
│  │  └─────────┘  └─────────┘  └─────────┘    │          │
│  └─────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

### 核心模块

#### 1. AI Adapter Layer（AI 适配层）

```
┌─────────────────────────────────────────┐
│            AI Adapter                    │
├─────────────────────────────────────────┤
│                                         │
│  callAI(provider, config, prompt)        │
│       │                                 │
│       ├──▶ MiniMax Adapter             │
│       ├──▶ OpenAI Adapter              │
│       └──▶ Anthropic Adapter            │
│                                         │
│  parseAIResponse(content)                │
│       │                                 │
│       └──▶ JSON Extractor               │
│              - markdown 代码块提取       │
│              - 括号范围提取              │
│              - 容错解析                 │
│                                         │
└─────────────────────────────────────────┘
```

#### 2. Registry（组件注册表）

```
┌─────────────────────────────────────────┐
│         ComponentRegistry                │
├─────────────────────────────────────────┤
│                                         │
│  register(type, renderFn)               │
│       │                                 │
│       ├──▶ 'card'     → CardRenderer    │
│       ├──▶ 'form'     → FormRenderer    │
│       ├──▶ 'input'    → InputRenderer   │
│       ├──▶ 'button'   → ButtonRenderer  │
│       ├──▶ 'list'     → ListRenderer    │
│       ├──▶ 'alert'    → AlertRenderer   │
│       ├──▶ 'stats'    → StatsRenderer   │
│       ├──▶ 'profile'  → ProfileRenderer │
│       └──▶ 'buttonGroup' → ...          │
│                                         │
│  render(spec) → VNode                   │
│       │                                 │
│       └──▶ 递归渲染子组件               │
│                                         │
└─────────────────────────────────────────┘
```

#### 3. Renderer（渲染器）

```
┌─────────────────────────────────────────┐
│              Renderer                     │
├─────────────────────────────────────────┤
│                                         │
│  createDom(vnode) → DOM                │
│       │                                 │
│       ├──▶ Text Node                   │
│       ├──▶ Element                     │
│       ├──▶ Component ──▶ createDom()    │
│       └──▶ Fragment                    │
│                                         │
│  patch(parent, newVNode, oldVNode)     │
│       │                                 │
│       ├──▶ updateProps                │
│       ├──▶ updateChildren             │
│       │     ├──▶ diffChildrenKeyed()   │
│       │     └──▶ diffChildren()        │
│       └──▶ applyPatches()              │
│                                         │
│  hydrate(dom, vnode)                   │
│       │                                 │
│       └──▶ SSR 复用已有 DOM             │
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
│       └──▶ [getter, setter]            │
│                                         │
│  Signal.get()                           │
│       │                                 │
│       └──▶ 收集当前订阅者               │
│                                         │
│  Signal.set(newValue)                   │
│       │                                 │
│       └──▶ 通知所有订阅者               │
│             └──▶ batch() 批量更新        │
│                                         │
│  createEffect(fn)                       │
│       │                                 │
│       └──▶ 自动追踪依赖                 │
│             └──▶ WeakMap 防止内存泄漏    │
│                                         │
└─────────────────────────────────────────┘
```

#### 5. Diff 算法

```
┌─────────────────────────────────────────┐
│         O(n) Keyed Diff                 │
├─────────────────────────────────────────┤
│                                         │
│  diffChildrenKeyed(new, old)            │
│       │                                 │
│       ├──▶ 按 key 建立 Map              │
│       │     ├──▶ newKeyed: Map        │
│       │     └──▶ oldKeyed: Map         │
│       │                                 │
│       ├──▶ 第一遍：顺序扫描             │
│       │     ├──▶ 新增 → INSERT        │
│       │     ├──▶ 匹配 → 递归 diff      │
│       │     └──▶ 乱序 → MOVE          │
│       │                                 │
│       └──▶ 第二遍：删除检测             │
│             └──▶ 剩余旧节点 → REMOVE   │
│                                         │
│  PatchType: REPLACE | REMOVE | INSERT  │
│              UPDATE | MOVE | TEXT       │
│                                         │
└─────────────────────────────────────────┘
```

#### 6. VNode 结构

```
┌─────────────────────────────────────────┐
│              VNode                       │
├─────────────────────────────────────────┤
│                                         │
│  interface VNode {                     │
│    type: string | Component             │
│    props: VNodeProps                   │
│    children: (VNode | string)[]         │
│    key?: string | number                │
│    flags: VNodeFlags                   │
│    patchFlag?: PatchFlags  // 优化      │
│  }                                     │
│                                         │
│  enum VNodeFlags {                     │
│    Element = 1,                        │
│    Text = 2,                           │
│    Component = 4,                      │
│    Fragment = 8                        │
│  }                                     │
│                                         │
│  enum PatchFlags {                     │
│    TEXT = 1,    // 仅文本变化           │
│    CLASS = 2,   // 仅 class 变化        │
│    STYLE = 4,   // 仅 style 变化        │
│    PROPS = 8,   // 其他 props 变化     │
│    FULL = 16    // 完整 diff            │
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
│  │ [________________]      │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 密码                     │  │
│  │ [________________]      │  │
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
  history: Spec[];         // 历史记录
  error: string | null;   // 错误信息
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

router.register('onChange', async ({ field, value }) => {
  return await ai.understand('input_change', { field, value });
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
// 创建 AI 生成器
const gen = createAIGen({
  container: '#app',
  apiKey: 'your-key',
  provider: 'minimax',  // 或 'openai'
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
}

// 非流式
const spec = await stream.generateOnce('创建表单');

// 状态管理
stream.getState();       // 当前状态
stream.getHistory();     // 历史
stream.clearHistory();   // 清空
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
setCount(1);    // 设置
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
const FowardedInput = forwardRef((props, ref) => {
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
signal.set(1); // 写入
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
