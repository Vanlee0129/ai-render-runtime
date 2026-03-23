# AI Render Runtime

> 将 AI 生成的结构化数据直接渲染为 UI 组件的引擎

[English](./README.en.md) | 中文

## 核心价值

**AI Native** - 不是另一个 React，而是专为 AI 设计的渲染引擎：

- 输入：AI 生成的 JSON/结构化数据
- 输出：高性能的 UI 组件
- 内置 AI 适配器，支持主流大模型
- **流式渲染**：实时显示 AI 生成过程
- **Intent 路由**：AI UI 交互自动触发 AI 理解

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
import { createIntentRouter, createAIStream } from 'ai-render-runtime';

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

### 2. 流式渲染

实时显示 AI 生成过程：

```javascript
const stream = createAIStream(config);
stream.onUpdate(state => {
  updateProgress(state.progress);
  if (state.currentSpec) {
    renderIncremental(state.currentSpec);
  }
});
```

### 3. Intent 路由

AI UI 交互自动触发 AI 理解：

```javascript
const router = createIntentRouter();
router.register('onSubmit', async (data) => {
  return await ai.understand('表单提交', data);
});
```

### 4. AI 状态管理

```javascript
const stream = createAIStream(config);

// 获取当前状态
stream.getState();    // { isGenerating, progress, currentSpec, history, error }

// 获取历史
stream.getHistory();   // 所有生成的 UI 历史

// 清空历史
stream.clearHistory();
```

### 5. 内置组件注册表

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

## 为什么需要 AI Render？

传统方案：
```
AI 返回 JSON → 手动写组件 → 绑定数据 → 测试
```

使用 AI Render：
```
AI 返回 JSON → AIRender.render() → 完成
```

使用流式 AI Render：
```
AI 流式输出 → 实时增量渲染 → 用户看到生成过程
```

## API 概览

### AI Native 核心

```typescript
// 直接渲染 AI 输出
new AIRender({ container, initialSpec })
air.update(specs)

// 流式生成
createAIStream(config)
stream.generate(prompt)  // AsyncGenerator
stream.onUpdate(callback)
stream.getState()
stream.getHistory()

// Intent 路由
createIntentRouter()
router.register(intent, handler)
router.handle(intent, payload)

// AI 生成
createAIGen(options)
gen.generate(prompt)
generate(prompt, container, apiKey)  // 便捷函数
```

### 响应式

```typescript
createSignal(initial)      // 信号
reactive(obj)              // 响应式对象
computed(fn)               // 计算属性
watch(fn, callback)       // 监听
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
onUnmounted(fn)            // 卸载
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
