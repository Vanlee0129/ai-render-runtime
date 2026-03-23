# Card 卡片组件

## 描述
通用卡片容器组件，用于承载和组织内容。可以包含标题、副标题、描述文本、子组件和操作按钮。

## 属性 (Spec Schema)
```typescript
{
  type: "card",
  title?: string,           // 卡片标题
  subtitle?: string,        // 副标题/描述性文字
  description?: string,    // 详细描述
  cardStyle?: string,      // 样式变体: "default" | "flat" | "border" | "glass"
  children?: Spec[],       // 子组件数组
  buttons?: ButtonSpec[],  // 操作按钮
  [key: string]: any       // 其他属性透传
}
```

## 样式
```css
.gen-card {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 24px;
}
.gen-card-flat { background: rgba(255,255,255,0.03); border: none; }
.gen-card-border { border: 1px solid; border-image: linear-gradient(135deg, #a78bfa, #f472b6) 1; }
.gen-card-glass { background: rgba(255,255,255,0.08); backdrop-filter: blur(10px); }
.gen-title { font-size: 20px; font-weight: 600; margin: 0 0 12px; }
.gen-subtitle { font-size: 14px; color: rgba(255,255,255,0.6); margin: 0 0 8px; }
```

## 渲染逻辑 (伪代码)
```
render(card):
  container = div.gen-card[apply cardStyle]
  
  if card.title:
    container << h3.gen-title(card.title)
  if card.subtitle:
    container << p.gen-subtitle(card.subtitle)
  if card.description:
    container << p(style="margin-top:8px")(card.description)
  if card.children:
    for child in card.children:
      container << render(child)
  if card.buttons:
    container << div(style="display:flex;gap:12px")
    for btn in card.buttons:
      container << render(btn)
  
  return container
```

## 示例 JSON
```json
{
  "type": "card",
  "title": "欢迎回来",
  "subtitle": "您的账户概览",
  "description": "查看您的最新活动和推荐内容。",
  "buttons": [
    { "type": "button", "variant": "primary", "label": "查看详情" },
    { "type": "button", "variant": "secondary", "label": "设置" }
  ]
}
```
