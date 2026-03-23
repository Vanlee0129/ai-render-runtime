# AI Render Runtime

> 下一代 AI 驱动的声明式 UI 渲染引擎

## 核心特性

- **Signal 响应式系统** - 细粒度响应式追踪，零开销更新
- **虚拟 DOM** - 高效的 DOM 抽象层
- **Diff 算法** - 智能差异检测，最小化 DOM 操作
- **Spec 解析** - 将 AI 生成的 JSON 转换为 UI 组件
- **JSX 支持** - 类 React 的组件编写方式
- **Hydrate/SSR** - 服务端渲染后的客户端接管

## 安装

```bash
npm install
npm run build
```

## 快速开始

### 方式 1: 使用 Spec（AI 友好）

```javascript
import { AIRender } from './dist/bundle.js';

const specs = [
  {
    type: 'card',
    title: '欢迎回来',
    buttons: [
      { type: 'button', label: '开始', variant: 'primary' }
    ]
  }
];

const app = new AIRender({
  container: '#app',
  initialSpec: specs
});

app.update(newSpecs);
```

### 方式 2: 使用 JSX

```tsx
import { h, render } from './dist/bundle.js';
import { UserCard, StatCard, Button } from './dist/bundle.js';

const App = () => (
  <div class="gen-root">
    <UserCard name="张三" email="zhangsan@example.com" role="管理员" />
    <StatCard label="总用户" value="12,345" trend={25} />
    <Button label="点击我" variant="primary" />
  </div>
);

render(App(), document.getElementById('app'));
```

### 方式 3: Hydrate（SSR 场景）

```javascript
import { hydrate } from './dist/bundle.js';
import { App } from './App.jsx';

// 在 SSR 渲染的 HTML 上绑定事件
hydrate(App(), '#app');
```

## 支持的组件类型

| 类型 | 说明 |
|------|------|
| `card` | 卡片容器 |
| `form` | 表单容器 |
| `input` | 输入框 |
| `button` | 按钮 |
| `list` | 列表 |
| `alert` | 警告框 |
| `stats` | 统计卡片 |
| `profile` | 用户卡片 |
| `buttonGroup` | 按钮组 |

## 按钮变体

- `primary` - 主按钮
- `secondary` - 次要按钮
- `danger` - 危险操作

## 示例

| 文件 | 说明 |
|------|------|
| `examples/basic.html` | 基础演示 |
| `examples/ai-demo.html` | AI 驱动的 UI 生成 |

## 架构

```
ai-render-runtime
├── src/
│   ├── signal.ts     # 响应式系统
│   ├── vdom.ts      # 虚拟 DOM
│   ├── diff.ts      # 差异算法
│   ├── renderer.ts  # 渲染引擎
│   ├── spec.ts      # Spec 解析器
│   ├── jsx.ts      # JSX pragma
│   ├── components/  # 示例组件
│   └── index.ts     # 主入口
├── dist/
│   └── bundle.js    # 打包后的 bundle
└── examples/
    ├── basic.html    # 基础演示
    └── ai-demo.html  # AI 驱动演示
```

## License

MIT
