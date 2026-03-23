# AI Render Runtime

> 将 AI 生成的结构化数据直接渲染为 UI 组件的引擎

[English](./README.en.md) | 中文

## 核心价值

**AI Native** - 不是另一个 React，而是专为 AI 设计的渲染引擎：

- 输入：AI 生成的 JSON/结构化数据
- 输出：高性能的 UI 组件
- 内置 AI 适配器，支持主流大模型

## 快速开始

### 方式 1: AI 驱动（核心场景）

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

### 方式 2: 传统 JSX

```tsx
import { h, render } from 'ai-render-runtime';

const App = () => (
  <div>
    <h1>Hello AI Render</h1>
    <button onClick={() => console.log('clicked')}>点击</button>
  </div>
);

render(<App />, document.getElementById('root'));
```

### 方式 3: AI 增强渲染

```javascript
import { generate } from 'ai-render-runtime';

// 自然语言描述 → AI 生成 UI → 渲染
const gen = await generate(
  '创建一个登录表单，包含用户名、密码输入框和提交按钮',
  '#app',
  'your-api-key'
);
```

## AI 原生特性

### 1. Spec 驱动渲染

AI 返回标准化 JSON，自动映射到组件：

```json
{
  "type": "form",
  "children": [
    { "type": "input", "placeholder": "用户名" },
    { "type": "input", "type": "password", "placeholder": "密码" },
    { "type": "button", "label": "登录" }
  ]
}
```

### 2. 内置组件注册表

| 组件 | 说明 |
|------|------|
| `card` | 卡片容器 |
| `form` | 表单容器 |
| `input` | 输入框 |
| `button` | 按钮 |
| `list` | 列表 |
| `alert` | 警告框 |
| `stats` | 统计卡片 |
| `profile` | 用户卡片 |

### 3. 热更新

AI 返回新数据时，无需刷新页面：

```javascript
// 增量更新
app.update(newSpecs);

// 或局部更新
app.render(partialSpecs);
```

### 4. AI 适配器

支持主流大模型：

```javascript
import { createAIGen } from 'ai-render-runtime';

const gen = createAIGen({
  container: '#app',
  apiKey: 'your-api-key',
  provider: 'minimax'  // 或 'openai', 'anthropic'
});

// 用户交互 → AI 理解意图 → 生成 UI
await gen.generate('显示本月销售前三的商品');
```

## 为什么需要 AI Render？

传统方案：
```
AI 返回 JSON → 手动写组件 → 绑定数据 → 测试
```

使用 AI Render：
```
AI 返回 JSON → AIRender.render() → 完成
```

## 技术架构

### 响应式内核

- **Signal** - 细粒度响应式，精准追踪依赖
- **Proxy 响应式** - Vue 3 风格深层响应
- **Computed** - 惰性求值缓存

### 高性能渲染

- **O(n) Diff** - key-based 差异算法
- **PatchFlags** - 精细化 DOM 更新
- **Fiber 调度** - 可中断渲染，支持优先级

### 现代开发体验

- JSX 支持
- TypeScript 完整类型
- SSR/Hydrate 支持

## API 概览

### 核心

```typescript
// AI 驱动的渲染
new AIRender({ container, initialSpec })
air.update(specs)

// 传统渲染
render(vnode, container)

// JSX
jsx(type, props)
```

### 响应式

```typescript
createSignal(initial)      // 信号
reactive(obj)              // 响应式对象
computed(fn)               // 计算属性
watch(fn, callback)        // 监听
```

### 组件

```typescript
memo(Component)            // 记忆化
useMemo(fn, deps)         // 值记忆化
useRef(initial?)          // DOM 引用
```

### 生命周期

```typescript
onMounted(fn)             // 挂载完成
onUpdated(fn)             // 更新完成
onUnmounted(fn)           // 卸载
```

### 高级

```typescript
KeepAlive                  // 组件缓存
Suspense                   // 异步加载
defineAsyncComponent()     // 异步组件
ErrorBoundary             // 错误边界
```

## 安装

```bash
npm install
npm run build
```

## 浏览器支持

现代浏览器（ES2020+）

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
