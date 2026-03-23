# Button 按钮组件

## 描述
交互式按钮组件，用于触发操作。支持多种样式变体和尺寸。

## 属性 (Spec Schema)
```typescript
{
  type: "button",
  label: string,            // 按钮文字 (必需)
  variant?: string,        // 样式变体
  size?: string,           // 尺寸大小
  shape?: string,           // 形状样式
  icon?: string,           // 图标 (emoji 或 SVG)
  disabled?: boolean,      // 是否禁用
  loading?: boolean,       // 加载状态
  onClick?: string,        // 点击回调名称
  [key: string]: any
}
```

## 变体 (Variants)
| 变体 | 描述 | 样式 |
|------|------|------|
| `primary` | 主按钮 | 渐变背景 #a78bfa → #f472b6 |
| `secondary` | 次要按钮 | 半透明背景 + 边框 |
| `ghost` | 幽灵按钮 | 透明背景，hover 时显示 |
| `danger` | 危险按钮 | 红色渐变 #f472b6 → #fb7185 |
| `success` | 成功按钮 | 绿色渐变 #22c55e → #4ade80 |
| `warning` | 警告按钮 | 橙色渐变 #f59e0b → #fbbf24 |
| `outline` | 轮廓按钮 | 透明背景 + 边框 |
| `dark` | 深色按钮 | 深色背景 #27272a |
| `white` | 白色按钮 | 白色背景 + 深色文字 |
| `link` | 链接按钮 | 无背景，文字样式 |

## 尺寸 (Sizes)
| 尺寸 | 内边距 | 字号 |
|------|--------|------|
| `xs` | 4px 8px | 12px |
| `sm` | 8px 16px | 13px |
| `md` | 10px 20px | 14px (默认) |
| `lg` | 14px 24px | 16px |
| `xl` | 18px 32px | 18px |

## 形状 (Shapes)
| 形状 | border-radius |
|------|---------------|
| `default` | 8px |
| `rounded` | 12px |
| `pill` | 9999px (胶囊形) |
| `square` | 4px |
| `circle` | 50% (圆形) |

## 样式
```css
.gen-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.gen-btn:hover { transform: translateY(-2px); }
.gen-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.gen-btn-primary { background: linear-gradient(135deg, #a78bfa, #f472b6); color: white; }
.gen-btn-secondary { background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); }
.gen-btn-ghost { background: transparent; color: rgba(255,255,255,0.7); }
.gen-btn-ghost:hover { background: rgba(255,255,255,0.1); }
```

## 渲染逻辑 (伪代码)
```
render(button):
  classes = ["gen-btn", f"gen-btn-{variant}", f"gen-btn-{size}"]
  if shape: classes << f"gen-btn-{shape}"
  
  el = button(disabled=disabled, class=classes.join(" "))
  
  if icon:
    el << span(style="margin-right:6px")(icon)
  
  el << text(label)
  
  if loading:
    el << span.spinner
  
  return el
```

## 示例 JSON
```json
{
  "type": "button",
  "label": "🚀 立即开始",
  "variant": "primary",
  "size": "lg",
  "shape": "rounded"
}
```

## 按钮组
多个按钮组合使用：
```json
{
  "type": "buttonGroup",
  "buttons": [
    { "type": "button", "label": "保存", "variant": "primary" },
    { "type": "button", "label": "取消", "variant": "ghost" }
  ]
}
```
