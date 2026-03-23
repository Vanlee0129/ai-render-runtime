/**
 * AI Render Runtime - Virtual DOM
 * 轻量级虚拟 DOM 实现
 */
/**
 * 虚拟节点标志
 */
export var VNodeFlags;
(function (VNodeFlags) {
    VNodeFlags[VNodeFlags["Element"] = 1] = "Element";
    VNodeFlags[VNodeFlags["Text"] = 2] = "Text";
    VNodeFlags[VNodeFlags["Component"] = 4] = "Component";
    VNodeFlags[VNodeFlags["Fragment"] = 8] = "Fragment";
})(VNodeFlags || (VNodeFlags = {}));
/**
 * 创建元素 VNode
 */
export function h(tag, props = {}, ...children) {
    return {
        type: tag,
        props,
        children: children.flat(),
        key: props.key,
        flags: VNodeFlags.Element
    };
}
/**
 * 创建文本 VNode
 */
export function t(text) {
    return {
        type: 'text',
        props: {},
        children: [text],
        flags: VNodeFlags.Text
    };
}
/**
 * 创建片段
 */
export function createFragment(props) {
    const children = Array.isArray(props.children)
        ? props.children.flat()
        : props.children ? [props.children] : [];
    return {
        type: 'fragment',
        props: {},
        children,
        flags: VNodeFlags.Fragment
    };
}
// 别名
export const Fragment = createFragment;
/**
 * 是同类节点
 */
export function isSameVNodeType(a, b) {
    return a.type === b.type && a.key === b.key;
}
/**
 * 创建组件 VNode
 */
export function createComponent(component, props) {
    return {
        type: component,
        props,
        children: [],
        flags: VNodeFlags.Component
    };
}
/**
 * JSX 工厂函数（供编译器使用）
 */
export function jsx(type, props) {
    const { children, ...rest } = props;
    return h(type, rest, ...(children ? [children].flat() : []));
}
//# sourceMappingURL=vdom.js.map