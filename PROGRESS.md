# AI Render Runtime - 项目进度

## 架构更新

### 新的分层架构

```
ai-render-runtime/
├── src/
│   ├── vdom.ts        # 虚拟 DOM (核心)
│   ├── diff.ts        # 差异算法 (核心)
│   ├── renderer.ts    # 渲染引擎 (核心)
│   ├── signal.ts     # 响应式系统 (核心)
│   ├── jsx.ts        # JSX pragma
│   ├── registry.ts   # 组件注册表 ⬅️ 新增
│   └── index.ts      # 主入口
├── components/        # 组件定义目录 ⬅️ 新增 (自然语言 MD)
│   ├── README.md
│   ├── card.md       # 卡片组件
│   ├── form.md       # 表单组件
│   ├── button.md     # 按钮组件
│   ├── stats.md      # 统计组件
│   ├── profile.md    # 用户信息组件
│   ├── alert.md      # 提示组件
│   └── list.md       # 列表组件
├── styles/
│   └── components.css # 组件样式
└── dist/
    └── bundle.js
```

### 核心理念
- **runtime 保持精简**：只包含核心渲染逻辑
- **组件定义在 MD 文件**：自然语言描述，易读易维护
- **AI 友好**：AI 可以直接读取 MD 理解组件规范

## 核心模块 ✅

| 模块 | 文件 | 状态 | 说明 |
|------|------|------|------|
| Signal | `src/signal.ts` | ✅ | 响应式状态管理 |
| Virtual DOM | `src/vdom.ts` | ✅ | 虚拟节点创建 |
| Diff | `src/diff.ts` | ✅ | 差异算法 |
| Renderer | `src/renderer.ts` | ✅ | DOM 渲染 |
| Registry | `src/registry.ts` | ✅ | 组件注册表 |
| JSX | `src/jsx.ts` | ✅ | JSX pragma |
| Bundle | `dist/bundle.js` | ✅ | 编译产物 |

## 组件定义 (Markdown) ✅

| 组件 | MD 文件 | 状态 | 说明 |
|------|---------|------|------|
| Card | `card.md` | ✅ | 通用卡片容器 |
| Form | `form.md` | ✅ | 表单容器 |
| Input | `form.md` | ✅ | 输入框 |
| Button | `button.md` | ✅ | 交互按钮 |
| Stats | `stats.md` | ✅ | 统计卡片 |
| Profile | `profile.md` | ✅ | 用户信息卡片 |
| Alert | `alert.md` | ✅ | 消息提示 |
| List | `list.md` | ✅ | 列表组件 |
| ButtonGroup | `button.md` | ✅ | 按钮组 |

## API 设计

```javascript
import { AIRender, registry } from 'ai-render-runtime';

// 单行 API
const air = new AIRender({ container, initialSpec });
air.render(spec);

// 直接渲染
registry.render(spec);

// 注册自定义组件
registry.register('myComponent', (spec, render) => {
  return h('div', { class: 'custom' }, spec.content);
});
```

## 添加新组件

1. 在 `components/` 创建 `组件名.md` 文件
2. 描述属性、样式、渲染逻辑
3. 在 `src/registry.ts` 中添加渲染器

## 下一步

1. [ ] 创建更多组件 (modal, tabs, table 等)
2. [ ] 添加组件变体支持
3. [ ] 性能基准测试
4. [ ] SSR/Hydrate 完善
5. [ ] 文档完善
