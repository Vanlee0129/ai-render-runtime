/**
 * AI Render Runtime - Virtual DOM
 * 轻量级虚拟 DOM 实现
 */
import { getCachedVNode, clearVNodeCache } from './vnode-cache';
let isStaticHoistingEnabled = false;
export function enableStaticHoisting() {
    isStaticHoistingEnabled = true;
}
export function disableStaticHoisting() {
    isStaticHoistingEnabled = false;
    clearVNodeCache();
}
function isStaticElement(tag, props) {
    // Don't cache if props contain functions (handlers) or refs
    for (const key in props) {
        if (key.startsWith('on') && typeof props[key] === 'function')
            return false;
        if (key === 'ref')
            return false;
        if (key === 'key')
            continue;
        if (typeof props[key] === 'function')
            return false;
    }
    return true;
}
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
 * PatchFlags - 精细化更新标志
 */
export var PatchFlags;
(function (PatchFlags) {
    PatchFlags[PatchFlags["TEXT"] = 1] = "TEXT";
    PatchFlags[PatchFlags["CLASS"] = 2] = "CLASS";
    PatchFlags[PatchFlags["STYLE"] = 4] = "STYLE";
    PatchFlags[PatchFlags["PROPS"] = 8] = "PROPS";
    PatchFlags[PatchFlags["FULL"] = 16] = "FULL";
})(PatchFlags || (PatchFlags = {}));
/**
 * 创建元素 VNode
 */
export function h(tag, props = {}, ...children) {
    const { key, patchFlag, ...rest } = props;
    // Check if this is a static element suitable for caching
    if (isStaticHoistingEnabled && isStaticElement(tag, rest)) {
        return getCachedVNode(tag, rest, children.flat());
    }
    return {
        type: tag,
        props: rest,
        children: children.flat(),
        key,
        flags: VNodeFlags.Element,
        patchFlag
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