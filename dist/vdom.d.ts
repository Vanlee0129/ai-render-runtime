/**
 * AI Render Runtime - Virtual DOM
 * 轻量级虚拟 DOM 实现
 */
import { Ref, RefCallback } from './refs';
/**
 * 虚拟节点类型
 */
export type VNodeType = string | 'text' | 'fragment' | Component<any>;
/**
 * 组件类型
 */
export type Component<P = {}> = (props: P) => VNode | null;
/**
 * 组件 Props
 */
export interface ComponentProps {
    children?: VNode | VNode[];
    [key: string]: any;
}
/**
 * 虚拟节点属性
 */
export interface VNodeProps {
    [key: string]: any;
    onClick?: (e: Event) => void;
    onInput?: (e: Event) => void;
    onChange?: (e: Event) => void;
    onSubmit?: (e: Event) => void;
    onFocus?: (e: Event) => void;
    onBlur?: (e: Event) => void;
    onKeyDown?: (e: KeyboardEvent) => void;
    onKeyUp?: (e: KeyboardEvent) => void;
    onMouseEnter?: (e: MouseEvent) => void;
    onMouseLeave?: (e: MouseEvent) => void;
    ref?: RefCallback<any> | Ref<any>;
    class?: string;
    style?: string | Record<string, string>;
    key?: string | number;
}
/**
 * 虚拟节点
 */
export interface VNode {
    type: VNodeType;
    props: VNodeProps;
    children: (VNode | string)[];
    key?: string | number;
    flags: VNodeFlags;
}
/**
 * 虚拟节点标志
 */
export declare enum VNodeFlags {
    Element = 1,
    Text = 2,
    Component = 4,
    Fragment = 8
}
/**
 * 创建元素 VNode
 */
export declare function h(tag: string, props?: VNodeProps, ...children: (VNode | string)[]): VNode;
/**
 * 创建文本 VNode
 */
export declare function t(text: string): VNode;
/**
 * 创建片段
 */
export declare function createFragment(props: {
    children?: VNode | VNode[];
}): VNode;
export declare const Fragment: typeof createFragment;
/**
 * 是同类节点
 */
export declare function isSameVNodeType(a: VNode, b: VNode): boolean;
/**
 * 创建组件 VNode
 */
export declare function createComponent<P extends ComponentProps>(component: Component<P>, props: P): VNode;
/**
 * JSX 工厂函数（供编译器使用）
 */
export declare function jsx(type: VNodeType, props: VNodeProps): VNode;
//# sourceMappingURL=vdom.d.ts.map