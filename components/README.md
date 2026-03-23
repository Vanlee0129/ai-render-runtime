# 组件索引

> 这是 AI Render Runtime 的组件定义目录。每个组件都是自然语言描述的 Markdown 文件。

## 组件列表

| 组件 | 文件 | 描述 | 状态 |
|------|------|------|------|
| [Card](card.md) | `card.md` | 通用卡片容器 | ✅ |
| [Form](form.md) | `form.md` | 表单容器 | ✅ |
| [Button](button.md) | `button.md` | 交互按钮 | ✅ |
| [Stats](stats.md) | `stats.md` | 统计卡片 | ✅ |
| [Profile](profile.md) | `profile.md` | 用户信息卡片 | ✅ |
| [Alert](alert.md) | `alert.md` | 消息提示 | ✅ |
| [List](list.md) | `list.md) | 列表组件 | ✅ |

## 添加新组件

1. 在 `components/` 目录创建 `组件名.md` 文件
2. 按照模板格式编写组件定义
3. 在 `registry.ts` 中注册组件

## 组件模板

```markdown
# ComponentName 组件名

## 描述
简要描述组件用途。

## 属性 (Spec Schema)
```typescript
{
  type: "componentName",
  // 属性定义...
}
```

## 样式
```css
/* CSS 样式 */
```

## 渲染逻辑 (伪代码)
```
render(component):
  // 渲染逻辑...
```

## 示例 JSON
```json
{
  "type": "componentName",
  // 示例...
}
```
```

## 类型转换规则

组件的 Markdown 定义会被解析为运行时类型：

| Markdown 类型 | TypeScript 类型 |
|--------------|-----------------|
| `string` | `string` |
| `number` | `number` |
| `boolean` | `boolean` |
| `string[]` | `string[]` |
| `Spec[]` | `Spec[]` |
| `ButtonSpec` | `{ type: 'button', label: string, variant?: string, ... }` |
