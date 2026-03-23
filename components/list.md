# List 列表组件

## 描述
列表组件，用于展示有序或无序的数据列表。支持自定义列表项渲染、图标、分组和操作按钮。

## 属性 (Spec Schema)
```typescript
{
  type: "list",
  title?: string,          // 列表标题
  items: ListItem[],       // 列表项数组 (必需)
  ordered?: boolean,       // 是否有序列表
  numbered?: boolean,      // 显示序号
  icon?: string,           // 全局图标
  actions?: ActionSpec[],  // 列表操作
  buttons?: ButtonSpec[],  // 底部按钮
  emptyText?: string,      // 空状态文本
  [key: string]: any
}

interface ListItem {
  text: string,            // 主文本
  subtext?: string,         // 副文本/描述
  icon?: string,            // 列表项图标
  badge?: string,           // 徽章
  href?: string,            // 链接
  onClick?: string,         // 点击回调
  children?: ListItem[],   // 嵌套列表
}
```

## 样式
```css
.gen-list { list-style: none; padding: 0; margin: 0; }
.gen-list-item {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s;
}
.gen-list-item:hover { background: rgba(255,255,255,0.05); }
.gen-list-item:last-child { border-bottom: none; }
.gen-list-icon { font-size: 18px; flex-shrink: 0; }
.gen-list-content { flex: 1; min-width: 0; }
.gen-list-text { font-size: 14px; }
.gen-list-subtext { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 2px; }
.gen-list-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  background: rgba(167,139,250,0.2);
  color: #a78bfa;
}
.gen-list-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(167,139,250,0.2);
  color: #a78bfa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}
```

## 渲染逻辑 (伪代码)
```
render(list):
  container = div.gen-card
  
  if list.title:
    container << h3.gen-title(list.title)
  
  if list.items?.length:
    tag = list.ordered ? "ol" : "ul"
    listEl = tag.gen-list
    
    for (index, item) in list.items:
      li = li.gen-list-item
      
      // 序号或图标
      if list.numbered:
        li << span.gen-list-number(index + 1)
      else if item.icon || list.icon:
        li << span.gen-list-icon(item.icon || list.icon)
      
      // 内容
      content = div.gen-list-content
      content << span.gen-list-text(item.text)
      if item.subtext:
        content << p.gen-list-subtext(item.subtext)
      li << content
      
      // 徽章
      if item.badge:
        li << span.gen-list-badge(item.badge)
      
      listEl << li
    
    container << listEl
  else if list.emptyText:
    container << p(style="text-align:center;color:rgba(255,255,255,0.4)")(list.emptyText)
  
  // 按钮
  if list.buttons:
    container << div(style="margin-top:16px;display:flex;gap:12px")
    for btn in list.buttons:
      container << render(btn)
  
  return container
```

## 示例 JSON
```json
{
  "type": "list",
  "title": "项目列表",
  "items": [
    { "text": "AI Render Runtime", "subtext": "AI 原生 UI 渲染引擎", "badge": "v1.0", "icon": "🚀" },
    { "text": "MiniMax SDK", "subtext": "MiniMax API TypeScript SDK", "icon": "📦" },
    { "text": "Component Library", "subtext": "UI 组件库", "badge": "WIP", "icon": "🎨" }
  ]
}
```

## 带操作按钮的列表
```json
{
  "type": "list",
  "title": "最近消息",
  "items": [
    { "text": "系统通知", "subtext": "您的代码已通过审查", "icon": "📬", "badge": "新" },
    { "text": "评论回复", "subtext": "张三回复了您的评论", "icon": "💬" }
  ],
  "buttons": [
    { "type": "button", "variant": "primary", "label": "查看全部" }
  ]
}
```

## 空状态
```json
{
  "type": "list",
  "title": "搜索结果",
  "items": [],
  "emptyText": "暂无搜索结果"
}
```
