# Form 表单组件

## 描述
表单容器组件，用于组织和展示表单字段。支持输入框、下拉框、复选框等字段类型，以及表单提交和重置按钮。

## 属性 (Spec Schema)
```typescript
{
  type: "form",
  title?: string,           // 表单标题
  subtitle?: string,        // 表单说明
  fields?: InputSpec[],    // 表单字段数组
  buttons?: ButtonSpec[],   // 提交/重置按钮
  layout?: string,          // 布局: "vertical" | "horizontal"
  [key: string]: any
}
```

## 样式
```css
.gen-form { display: flex; flex-direction: column; gap: 16px; }
.gen-label { font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 6px; display: block; }
.gen-input { 
  width: 100%; 
  background: rgba(255,255,255,0.05); 
  border: 1px solid rgba(255,255,255,0.2); 
  border-radius: 8px; 
  padding: 12px 16px; 
  color: white; 
  font-size: 14px;
}
.gen-input:focus { outline: none; border-color: #a78bfa; }
```

## 渲染逻辑 (伪代码)
```
render(form):
  container = div.gen-card
  
  if form.title:
    container << h3.gen-title(form.title)
  if form.subtitle:
    container << p.gen-subtitle(form.subtitle)
  
  for field in form.fields:
    container << render(field)
  
  if form.buttons:
    container << div(style="margin-top:16px;display:flex;gap:12px")
    for btn in form.buttons:
      container << render(btn)
  
  return container
```

## 示例 JSON
```json
{
  "type": "form",
  "title": "用户登录",
  "subtitle": "请输入您的账户信息",
  "fields": [
    { "type": "input", "label": "邮箱地址", "type_attr": "email", "placeholder": "you@example.com" },
    { "type": "input", "label": "密码", "type_attr": "password", "placeholder": "••••••••" }
  ],
  "buttons": [
    { "type": "button", "variant": "primary", "label": "登录" },
    { "type": "button", "variant": "ghost", "label": "忘记密码?" }
  ]
}
```

## 字段类型
- `input` - 文本/密码/邮箱等输入框
- `textarea` - 多行文本
- `select` - 下拉选择
- `checkbox` - 复选框
- `radio` - 单选框
