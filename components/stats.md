# Stats 统计组件

## 描述
统计卡片组件，用于展示关键数据指标。通常以网格形式展示多个统计数据点，支持显示数值、标签和趋势指示。

## 属性 (Spec Schema)
```typescript
{
  type: "stats",
  items?: StatItem[],      // 统计项数组
  columns?: number,         // 列数: 2 | 3 | 4
  layout?: string,         // 布局: "grid" | "row"
  [key: string]: any
}

interface StatItem {
  value: number | string,  // 数值
  label: string,           // 标签
  trend?: number,          // 趋势百分比 (正数上升，负数下降)
  trendLabel?: string,     // 趋势标签
  icon?: string,           // 图标
  color?: string,         // 颜色主题: "primary" | "success" | "warning" | "danger"
}
```

## 样式
```css
.gen-grid { display: grid; gap: 16px; }
.gen-grid-2 { grid-template-columns: repeat(2, 1fr); }
.gen-grid-3 { grid-template-columns: repeat(3, 1fr); }
.gen-grid-4 { grid-template-columns: repeat(4, 1fr); }
.gen-stat-card {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}
.gen-stat-value {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #a78bfa, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.gen-stat-label {
  font-size: 14px;
  color: rgba(255,255,255,0.6);
  margin-top: 8px;
}
.gen-trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-top: 8px;
  padding: 4px 8px;
  border-radius: 4px;
}
.gen-trend-up { background: rgba(34,197,94,0.2); color: #22c55e; }
.gen-trend-down { background: rgba(239,68,68,0.2); color: #ef4444; }
```

## 渲染逻辑 (伪代码)
```
render(stats):
  columns = stats.columns || 3
  container = div(f"gen-grid gen-grid-{columns}")
  
  for item in (stats.items || []):
    card = div.gen-stat-card
    
    // 数值
    valueEl = div.gen-stat-value(item.value)
    if item.icon: valueEl << span(item.icon)
    card << valueEl
    
    // 标签
    card << div.gen-stat-label(item.label)
    
    // 趋势
    if item.trend !== undefined:
      trendClass = item.trend >= 0 ? "gen-trend-up" : "gen-trend-down"
      trendIcon = item.trend >= 0 ? "↑" : "↓"
      card << span(trendClass)(f"{trendIcon}{abs(item.trend)}%")
    
    container << card
  
  return container
```

## 示例 JSON
```json
{
  "type": "stats",
  "columns": 3,
  "items": [
    { "value": 12580, "label": "总用户", "trend": 12.5, "icon": "👥" },
    { "value": 3580, "label": "月活用户", "trend": -2.3, "icon": "🔥" },
    { "value": "¥128.5K", "label": "总收入", "trend": 25.8, "icon": "💰" }
  ]
}
```

## 变体样式
```json
{
  "type": "stats",
  "layout": "row",
  "items": [
    { "value": "99.9%", "label": "可用率", "color": "success" },
    { "value": "<50ms", "label": "响应时间", "color": "primary" },
    { "value": "1.2M", "label": "日请求", "trend": 8.5 }
  ]
}
```
