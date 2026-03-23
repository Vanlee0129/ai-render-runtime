# Profile 用户信息组件

## 描述
用户信息卡片组件，用于展示个人资料信息。通常包含头像、姓名、邮箱、徽章和个人简介。

## 属性 (Spec Schema)
```typescript
{
  type: "profile",
  name: string,             // 用户名 (必需)
  email?: string,          // 邮箱
  avatar?: string,         // 头像 URL 或 emoji
  badge?: string,          // 徽章/标签
  bio?: string,            // 个人简介
  role?: string,           // 角色/职位
  location?: string,       // 位置
  website?: string,        // 网站
  social?: SocialLinks,    // 社交链接
  buttons?: ButtonSpec[],  // 操作按钮
  layout?: string,         // 布局: "center" | "left" | "horizontal"
  [key: string]: any
}

interface SocialLinks {
  twitter?: string,
  github?: string,
  linkedin?: string
}
```

## 样式
```css
.gen-profile {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 24px;
}
.gen-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a78bfa, #f472b6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 24px;
  margin: 0 auto 16px;
}
.gen-profile-name { font-size: 20px; font-weight: 600; margin: 0 0 4px; }
.gen-profile-email { font-size: 14px; color: rgba(255,255,255,0.6); margin: 0 0 8px; }
.gen-profile-bio { font-size: 14px; color: rgba(255,255,255,0.7); margin: 12px 0; }
.gen-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}
.gen-badge-primary { background: rgba(167,139,250,0.2); color: #a78bfa; }
.gen-badge-success { background: rgba(34,197,94,0.2); color: #22c55e; }
```

## 渲染逻辑 (伪代码)
```
render(profile):
  container = div.gen-card
  container.classList.add(f"gen-profile-layout-{layout || 'center'}")
  
  // 头像
  avatarEl = div.gen-avatar
  if profile.avatar?.startsWith("http"):
    avatarEl << img(src=profile.avatar, alt=profile.name)
  else:
    avatarEl << text(profile.avatar || profile.name?.charAt(0) || "?")
  container << avatarEl
  
  // 姓名
  container << h3.gen-profile-name(profile.name)
  
  // 邮箱
  if profile.email:
    container << p.gen-profile-email(profile.email)
  
  // 徽章
  if profile.badge:
    container << span(f"gen-badge gen-badge-primary")(profile.badge)
  
  // 角色
  if profile.role:
    container << p(style="color:rgba(255,255,255,0.5)")(profile.role)
  
  // 简介
  if profile.bio:
    container << p.gen-profile-bio(profile.bio)
  
  // 按钮
  if profile.buttons:
    container << div(style="margin-top:16px;display:flex;gap:12px;justify-content:center")
    for btn in profile.buttons:
      container << render(btn)
  
  return container
```

## 示例 JSON
```json
{
  "type": "profile",
  "name": "张明远",
  "email": "zhangmingyuan@example.com",
  "avatar": "👨‍💻",
  "badge": "高级工程师",
  "role": "全栈开发者",
  "bio": "热爱开源，专注于前端性能和开发者体验。5年+前端开发经验。",
  "buttons": [
    { "type": "button", "variant": "primary", "label": "关注" },
    { "type": "button", "variant": "secondary", "label": "私信" }
  ]
}
```

## 水平布局变体
```json
{
  "type": "profile",
  "layout": "horizontal",
  "name": "李雪",
  "email": "li.xue@company.com",
  "role": "产品经理",
  "badge": "MVP",
  "bio": "负责产品设计与用户增长"
}
```
