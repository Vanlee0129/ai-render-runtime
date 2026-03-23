/**
 * AI Render Runtime - JSX Support
 * 提供 h() 和 Fragment 作为 JSX pragma
 */
import { h, t, createFragment } from './vdom';
// JSX 元素工厂函数
export function jsx(type, props, key) {
    const { children, ...rest } = props;
    // 处理 key
    const vnode = h(type, key !== undefined ? { ...rest, key } : rest, ...(Array.isArray(children) ? children.flat() : children ? [children] : []));
    return vnode;
}
// JSX Fragment 工厂 - re-export createFragment from vdom as Fragment
export const Fragment = createFragment;
// 导出 h 作为默认 pragma
export { h as createElement };
export { t as text };
//# sourceMappingURL=jsx.js.map