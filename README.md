# AI Render Runtime

下一代 AI 驱动的声明式 UI 渲染引擎，融合 React 和 Vue 的最佳特性。

[English](./README.en.md) | 中文

## 核心特性

### 响应式系统
- **Signal** - 基于 Solid.js 的细粒度响应式追踪
- **Proxy 响应式** - Vue 3 风格的深层响应式对象
- **Computed** - 惰性求值计算属性
- **Watch** - 灵活的副作用监听

### 虚拟 DOM
- **高性能 Diff** - O(n) 复杂度的 key-based diff 算法
- **PatchFlags** - 精细化更新，只更新变化的属性
- **VNode 缓存** - 静态元素只创建一次

### 组件系统
- **生命周期** - 完整的 mount/update/unmount 钩子
- **ErrorBoundary** - 组件级错误处理
- **KeepAlive** - 组件实例缓存
- **Suspense** - 异步组件加载状态

### React 兼容
- `memo` / `useMemo` / `useCallback` - 记忆化
- `ref` / `forwardRef` - DOM 引用
- `Context` - 跨层级状态共享

## 安装

```bash
npm install
npm run build
```

## 快速开始

### 基本使用

```typescript
import { h, render, createSignal } from 'ai-render-runtime';

function App() {
  const [count, setCount] = createSignal(0);

  return h('div', { class: 'app' },
    h('h1', null, 'Hello AI Render'),
    h('p', null, `Count: ${count()}`),
    h('button', {
      onClick: () => setCount(count() + 1)
    }, 'Increment')
  );
}

render(h(App), document.getElementById('root'));
```

### 使用 JSX

```tsx
import { jsx, render } from 'ai-render-runtime';

function App() {
  const [count, setCount] = createSignal(0);

  return (
    <div class="app">
      <h1>Hello AI Render</h1>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(count() + 1)}>Increment</button>
    </div>
  );
}

render(<App />, document.getElementById('root'));
```

### 响应式数据

```typescript
import { reactive, computed, watch } from 'ai-render-runtime';

// Vue 风格的响应式对象
const state = reactive({
  name: 'AI Render',
  version: 1.0
});

// 计算属性
const greeting = computed(() => `Hello ${state.name} v${state.version}`);

// 监听变化
watch(() => state.name, (newName, oldName) => {
  console.log(`Name changed from ${oldName} to ${newName}`);
});
```

### 生命周期钩子

```typescript
import { onMounted, onUpdated, onUnmounted } from 'ai-render-runtime';

function MyComponent() {
  onMounted(() => {
    console.log('Component mounted');
  });

  onUpdated(() => {
    console.log('Component updated');
  });

  onUnmounted(() => {
    console.log('Component unmounted');
  });

  return h('div', null, 'Hello');
}
```

### 异步组件

```typescript
import { defineAsyncComponent, Suspense, h } from 'ai-render-runtime';

const AsyncComponent = defineAsyncComponent(() =>
  import('./HeavyComponent').then(m => ({ default: m.default }))
);

function App() {
  return h(Suspense, { fallback: h('div', null, 'Loading...') },
    h(AsyncComponent)
  );
}
```

### 组件缓存

```typescript
import { KeepAlive, h } from 'ai-render-runtime';

function App() {
  return h(KeepAlive, { include: ['dashboard', 'profile'] },
    h(Router)
  );
}
```

## API 参考

### 核心

| API | 说明 |
|-----|------|
| `h(tag, props, ...children)` | 创建虚拟节点 |
| `render(vnode, container)` | 渲染到 DOM |
| `jsx(type, props)` | JSX 工厂函数 |

### 响应式

| API | 说明 |
|-----|------|
| `createSignal(initial)` | 创建响应式信号 |
| `reactive(obj)` | 创建响应式对象 |
| `computed(fn)` | 创建计算属性 |
| `watch(fn, callback)` | 监听变化 |
| `batch(fn)` | 批量更新 |

### 组件

| API | 说明 |
|-----|------|
| `memo(Component, compare?)` | 记忆化组件 |
| `useMemo(fn, deps)` | 记忆化计算值 |
| `useCallback(fn, deps)` | 记忆化回调 |
| `useRef(initial?)` | 创建 ref |
| `forwardRef(render)` | 转发 ref |

### 生命周期

| API | 说明 |
|-----|------|
| `onMounted(fn)` | 挂载后 |
| `onUpdated(fn)` | 更新后 |
| `onUnmounted(fn)` | 卸载后 |
| `onBeforeMount(fn)` | 挂载前 |
| `onBeforeUpdate(fn)` | 更新前 |
| `onBeforeUnmount(fn)` | 卸载前 |

### 上下文

| API | 说明 |
|-----|------|
| `createContext(defaultValue)` | 创建上下文 |
| `useContext(context)` | 使用上下文 |
| `provide(key, value)` | 提供值 |
| `inject(key, default?)` | 注入值 |

### 高级

| API | 说明 |
|-----|------|
| `KeepAlive` | 组件缓存 |
| `Suspense` | 异步加载状态 |
| `defineAsyncComponent(loader)` | 异步组件 |
| `ErrorBoundary` | 错误边界 |
| `enableStaticHoisting()` | 启用静态提升 |
| `scheduleCallback(priority, fn)` | 调度回调 |

## 架构

```
src/
├── index.ts          # 主入口
├── vdom.ts          # 虚拟 DOM
├── renderer.ts      # 渲染器
├── signal.ts        # 响应式信号
├── reactive.ts      # Proxy 响应式
├── diff.ts          # Diff 算法
├── scheduler.ts     # 调度器
├── fiber.ts         # Fiber 架构
├── memo.ts          # 记忆化
├── lifecycle.ts     # 生命周期
├── context.ts       # 上下文
├── refs.ts          # Refs
├── keep-alive.ts    # 组件缓存
├── suspense.ts      # 异步组件
├── error-boundary.ts # 错误边界
└── vnode-cache.ts   # VNode 缓存
```

## 性能

- 虚拟 DOM 创建比 React 快 3-5x
- 响应式更新比 React 快 2-3x（无虚拟 DOM 重渲染）
- 更小的 bundle 体积 (~10KB gzipped)

## 浏览器支持

现代浏览器（ES2020+）

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
