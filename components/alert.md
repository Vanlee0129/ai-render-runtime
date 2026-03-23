# Alert 提示组件

## 描述
消息提示组件，用于向用户展示重要信息、警告、错误或成功反馈。支持多种类型和可关闭选项。

## 属性 (Spec Schema)
```typescript
{
  type: "alert",
  title?: string,          // 标题
  message: string,         // 消息内容 (必需)
  alertType?: string,     // 类型: "info" | "success" | "warning" | "danger" | "error"
  icon?: string,          // 自定义图标
  closable?: boolean,     // 是否可关闭
  action?: ButtonSpec,    // 操作按钮
  [key: string]: any
}
```

## 类型 (Alert Types)
| 类型 | 含义 | 颜色 | 默认图标 |
|------|------|------|----------|
| `info` | 信息提示 | #3b82f6 | ℹ️ |
| `success` | 成功反馈 | #22c55e | ✅ |
| `warning` | 警告提示 | #f59e0b | ⚠️ |
| `danger` | 危险/错误 | #ef4444 | ❌ |
| `error` | 错误提示 | #ef4444 | ❌ |

## 样式
```css
.gen-alert {
  padding: 16px;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.gen-alert-info { background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.3); }
.gen-alert-success { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); }
.gen-alert-warning { background: rgba(251,146,60,0.1); border: 1px solid rgba(251,146,60,0.3); }
.gen-alert-danger, .gen-alert-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); }
.gen-alert-icon { font-size: 18px; flex-shrink: 0; }
.gen-alert-content { flex: 1; }
.gen-alert-title { font-weight: 600; margin: 0 0 4px; }
.gen-alert-message { margin: 0; font-size: 14px; opacity: 0.9; }
.gen-alert-close { 
  background: none; 
  border: none; 
  color: inherit; 
  cursor: pointer; 
  padding: 4px;
  opacity: 0.6;
}
.gen-alert-close:hover { opacity: 1; }
```

## 渲染逻辑 (伪代码)
```
render(alert):
  type = alert.alertType || "info"
  container = div(f"gen-alert gen-alert-{type}")
  
  // 图标
  icons = { info: "ℹ️", success: "✅", warning: "⚠️", danger: "❌", error: "❌" }
  icon = alert.icon || icons[type]
  container << span.gen-alert-icon(icon)
  
  // 内容
  content = div.gen-alert-content
  if alert.title:
    content << h4.gen-alert-title(alert.title)
  content << p.gen-alert-message(alert.message)
  container << content
  
  // 操作按钮
  if alert.action:
    container << render(alert.action)
  
  // 关闭按钮
  if alert.closable:
    container << button.gen-alert-close("×")
  
  return container
```

## 示例 JSON
```json
{
  "type": "alert",
  "alertType": "success",
  "title": "操作成功",
  "message": "您的设置已保存成功。"
}
```

## 多种类型示例
```json
[
  { "type": "alert", "alertType": "info", "message": "您的账户将于 30 天后过期" },
  { "type": "alert", "alertType": "warning", "title": "注意", "message": "请在 24 小时内完成验证" },
  { "type": "alert", "alertType": "danger", "message": "支付失败，请检查卡片信息" }
]
```

## 可关闭提示
```json
{
  "type": "alert",
  "alertType": "info",
  "message": "新版本已发布",
  "closable": true
}
```
