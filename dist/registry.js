/**
 * AI Render Runtime - Component Registry
 * 轻量级组件注册表
 */
import { h } from './vdom';
// 组件渲染器注册表
class ComponentRegistry {
    constructor() {
        this.renderers = new Map();
        this.registerDefaultRenderers();
    }
    // 安全获取数组
    safeArray(val) {
        if (Array.isArray(val))
            return val;
        if (val && typeof val === 'object')
            return Object.values(val);
        return [];
    }
    registerDefaultRenderers() {
        // Card 组件
        this.register('card', (s, render) => {
            const kids = [];
            if (s.title)
                kids.push(h('h3', { class: 'gen-title' }, s.title));
            if (s.subtitle)
                kids.push(h('p', { class: 'gen-subtitle' }, s.subtitle));
            if (s.description)
                kids.push(h('p', { style: 'margin-top:8px' }, s.description));
            if (s.children) {
                const children = this.safeArray(s.children);
                children.forEach(c => kids.push(render(c)));
            }
            if (s.buttons && Array.isArray(s.buttons)) {
                const btnKids = [];
                s.buttons.forEach((btn) => btnKids.push(render(btn)));
                kids.push(h('div', { style: 'margin-top:16px;display:flex;gap:12px' }, ...btnKids));
            }
            let cls = 'gen-card';
            if (s.cardStyle === 'flat')
                cls += ' gen-card-flat';
            else if (s.cardStyle === 'border')
                cls += ' gen-card-border';
            else if (s.cardStyle === 'glass')
                cls += ' gen-card-glass';
            return h('div', { class: cls }, ...kids);
        });
        // Form 组件
        this.register('form', (s, render) => {
            const kids = [];
            if (s.title)
                kids.push(h('h3', { class: 'gen-title' }, s.title));
            if (s.subtitle)
                kids.push(h('p', { class: 'gen-subtitle' }, s.subtitle));
            if (s.fields && Array.isArray(s.fields)) {
                s.fields.forEach((f) => kids.push(render(f)));
            }
            if (s.buttons && Array.isArray(s.buttons)) {
                const btnKids = [];
                s.buttons.forEach((btn) => btnKids.push(render(btn)));
                kids.push(h('div', { style: 'margin-top:16px;display:flex;gap:12px' }, ...btnKids));
            }
            return h('div', { class: 'gen-card' }, ...kids);
        });
        // Input 组件
        this.register('input', (s) => {
            const kids = [];
            if (s.label)
                kids.push(h('label', { class: 'gen-label' }, s.label));
            kids.push(h('input', {
                class: 'gen-input',
                type: s.type_attr || s.type || 'text',
                placeholder: s.placeholder || '',
                name: s.name || ''
            }));
            return h('div', { style: 'margin-bottom:12px' }, ...kids);
        });
        // Button 组件
        this.register('button', (s) => {
            const kids = [];
            if (s.icon)
                kids.push(h('span', { style: 'margin-right:6px' }, s.icon));
            if (s.label)
                kids.push(s.label);
            const cls = ['gen-btn', `gen-btn-${s.variant || 'primary'}`];
            if (s.size && s.size !== 'md')
                cls.push(`gen-btn-${s.size}`);
            if (s.shape)
                cls.push(`gen-btn-${s.shape}`);
            return h('button', { class: cls.join(' '), disabled: s.disabled }, ...kids);
        });
        // List 组件
        this.register('list', (s, render) => {
            const kids = [];
            if (s.title)
                kids.push(h('h3', { class: 'gen-title' }, s.title));
            if (s.items && Array.isArray(s.items) && s.items.length) {
                const tag = s.ordered ? 'ol' : 'ul';
                const items = s.items.map((item, i) => {
                    const liKids = [];
                    if (s.numbered)
                        liKids.push(h('span', { class: 'gen-list-number' }, String(i + 1)));
                    else if (item.icon || s.icon)
                        liKids.push(h('span', { class: 'gen-list-icon' }, item.icon || s.icon));
                    const content = h('div', { class: 'gen-list-content' });
                    content.children.push(h('span', { class: 'gen-list-text' }, item.text || item.label || ''));
                    if (item.subtext)
                        content.children.push(h('p', { class: 'gen-list-subtext' }, item.subtext));
                    liKids.push(content);
                    if (item.badge)
                        liKids.push(h('span', { class: 'gen-list-badge' }, item.badge));
                    return h('li', { class: 'gen-list-item' }, ...liKids);
                });
                kids.push(h(tag, { class: 'gen-list' }, ...items));
            }
            else if (s.emptyText) {
                kids.push(h('p', { style: 'text-align:center;color:rgba(255,255,255,0.4)' }, s.emptyText));
            }
            if (s.buttons && Array.isArray(s.buttons)) {
                const btnKids = [];
                s.buttons.forEach((btn) => btnKids.push(render(btn)));
                kids.push(h('div', { style: 'margin-top:16px;display:flex;gap:12px' }, ...btnKids));
            }
            return h('div', { class: 'gen-card' }, ...kids);
        });
        // Alert 组件
        this.register('alert', (s) => {
            const type = s.alertType || s.type || 'info';
            const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', danger: '❌', error: '❌' };
            const kids = [h('span', { class: 'gen-alert-icon' }, s.icon || icons[type] || icons.info)];
            const content = h('div', { class: 'gen-alert-content' });
            if (s.title)
                content.children.push(h('h4', { class: 'gen-alert-title' }, s.title));
            content.children.push(h('p', { class: 'gen-alert-message' }, s.message || ''));
            kids.push(content);
            return h('div', { class: `gen-alert gen-alert-${type}` }, ...kids);
        });
        // Stats 组件
        this.register('stats', (s) => {
            const items = this.safeArray(s.items);
            if (items.length === 0)
                return h('div', { class: 'gen-grid gen-grid-3' });
            const columns = s.columns || 3;
            const cards = items.map((item) => {
                const kids = [];
                const valueEl = h('div', { style: 'font-size:28px;font-weight:700;background:linear-gradient(135deg,#a78bfa,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent' });
                if (item.icon)
                    valueEl.children.push(item.icon, ' ');
                valueEl.children.push(String(item.value || 0));
                kids.push(valueEl);
                kids.push(h('div', { class: 'gen-stat-label' }, item.label || ''));
                if (item.trend !== undefined) {
                    const trendClass = item.trend >= 0 ? 'gen-trend-up' : 'gen-trend-down';
                    const trendIcon = item.trend >= 0 ? '↑' : '↓';
                    kids.push(h('span', { class: `gen-trend ${trendClass}` }, `${trendIcon}${Math.abs(item.trend)}%`));
                }
                return h('div', { class: 'gen-stat-card' }, ...kids);
            });
            return h('div', { class: `gen-grid gen-grid-${columns}` }, ...cards);
        });
        // Profile 组件
        this.register('profile', (s, render) => {
            const kids = [];
            const avatarEl = h('div', { class: 'gen-avatar' });
            if (s.avatar?.startsWith('http')) {
                avatarEl.children.push(h('img', { src: s.avatar, alt: s.name || '' }));
            }
            else {
                avatarEl.children.push(s.avatar || s.name?.charAt(0) || '?');
            }
            kids.push(avatarEl);
            if (s.name)
                kids.push(h('h3', { class: 'gen-profile-name', style: 'text-align:center' }, s.name));
            if (s.email)
                kids.push(h('p', { class: 'gen-profile-email', style: 'text-align:center' }, s.email));
            if (s.badge)
                kids.push(h('span', { class: 'gen-badge gen-badge-primary', style: 'display:block;width:fit-content;margin:12px auto 0' }, s.badge));
            if (s.role)
                kids.push(h('p', { style: 'text-align:center;color:rgba(255,255,255,0.5);margin-top:4px' }, s.role));
            if (s.bio)
                kids.push(h('p', { class: 'gen-profile-bio', style: 'text-align:center' }, s.bio));
            if (s.buttons && Array.isArray(s.buttons)) {
                const btnKids = [];
                s.buttons.forEach((btn) => btnKids.push(render(btn)));
                kids.push(h('div', { style: 'margin-top:16px;display:flex;gap:12px;justify-content:center' }, ...btnKids));
            }
            return h('div', { class: 'gen-card gen-profile' }, ...kids);
        });
        // ButtonGroup 组件
        this.register('buttonGroup', (s, render) => {
            const kids = [];
            if (s.title)
                kids.push(h('h3', { class: 'gen-title' }, s.title));
            if (s.buttons && Array.isArray(s.buttons)) {
                const btnKids = [];
                s.buttons.forEach((btn) => btnKids.push(render(btn)));
                kids.push(h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, ...btnKids));
            }
            return h('div', { class: 'gen-card' }, ...kids);
        });
    }
    register(type, fn) {
        this.renderers.set(type, fn);
    }
    get(type) {
        return this.renderers.get(type);
    }
    render(spec) {
        const self = this;
        const render = (s) => {
            if (!s || typeof s !== 'object') {
                return h('div', { class: 'gen-card' }, h('p', {}, 'Invalid spec'));
            }
            const fn = self.renderers.get(s.type);
            if (fn)
                return fn(s, render);
            // 默认 fallback：渲染为卡片
            return h('div', { class: 'gen-card' }, h('p', {}, `Unknown component: ${s.type}`));
        };
        return render(spec);
    }
}
// 单例导出
export const registry = new ComponentRegistry();
//# sourceMappingURL=registry.js.map