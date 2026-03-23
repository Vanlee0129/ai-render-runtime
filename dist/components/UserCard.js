/**
 * 示例组件 - 使用 JSX 语法
 */
import { h } from '../vdom';
// 用户卡片组件
export function UserCard(props) {
    return (h("div", { class: "gen-card", style: "text-align: center; padding: 24px;" },
        h("div", { class: "gen-avatar gen-avatar-lg", style: "background: linear-gradient(135deg, #a78bfa, #f472b6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 16px;" }, props.avatar || props.name?.charAt(0) || '?'),
        h("h3", { class: "gen-title", style: "margin-bottom: 4px;" }, props.name),
        h("p", { class: "gen-subtitle", style: "margin-bottom: 12px;" }, props.email),
        props.role && (h("span", { class: "gen-badge gen-badge-primary" }, props.role))));
}
// 统计卡片组件
export function StatCard(props) {
    return (h("div", { class: "gen-card", style: "text-align: center; padding: 20px;" },
        h("div", { style: "font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #a78bfa, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;" }, props.value),
        h("div", { class: "gen-subtitle", style: "margin-top: 8px;" }, props.label),
        props.trend !== undefined && (h("span", { class: `gen-badge ${props.trend >= 0 ? 'gen-badge-success' : 'gen-badge-danger'}`, style: "margin-top: 8px; display: inline-block;" },
            props.trend >= 0 ? '↑' : '↓',
            Math.abs(props.trend),
            "%"))));
}
// 按钮组件
export function Button(props) {
    return (h("button", { class: `gen-btn gen-btn-${props.variant || 'primary'} ${props.size ? `gen-btn-${props.size}` : ''}`, onClick: props.onClick }, props.label));
}
// 表单组件
export function Form(props) {
    const handleSubmit = (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        props.onSubmit?.(data);
    };
    return (h("form", { class: "gen-card gen-form", onSubmit: handleSubmit },
        h("h3", { class: "gen-title" }, props.title),
        props.fields.map(field => (h("div", { class: "gen-field" },
            h("label", { class: "gen-label" }, field.label),
            h("input", { class: "gen-input", type: field.type || 'text', name: field.name, placeholder: field.placeholder })))),
        h("div", { style: "display: flex; gap: 12px; margin-top: 8px;" },
            h(Button, { label: "\u63D0\u4EA4", variant: "primary" }),
            h(Button, { label: "\u91CD\u7F6E", variant: "secondary" }))));
}
// 页面布局
export function PageLayout(props) {
    return (h("div", { class: "gen-root", style: "max-width: 800px; margin: 0 auto; padding: 32px;" }, props.children));
}
// 网格布局
export function Grid(props) {
    return (h("div", { class: `gen-grid gen-grid-${props.cols || 3}` }, props.children));
}
//# sourceMappingURL=UserCard.js.map