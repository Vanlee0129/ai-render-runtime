/**
 * AI Render Runtime - Virtual DOM
 * 轻量级虚拟 DOM 实现
 */

import { createSignal } from './signal';
import { Ref, RefCallback } from './refs';

/**
 * 虚拟节点类型
 */
export type VNodeType = 
  | string                    // div, span, button 等 HTML 标签
  | 'text'                    // 文本节点
  | 'fragment'                // 片段
  | Component<any>;            // 组件函数

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
  // 事件处理
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
  // 特殊属性
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
export enum VNodeFlags {
  Element = 1,
  Text = 2,
  Component = 4,
  Fragment = 8,
}

/**
 * 创建元素 VNode
 */
export function h(
  tag: string,
  props: VNodeProps = {},
  ...children: (VNode | string)[]
): VNode {
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
export function t(text: string): VNode {
  return {
    type: 'text' as any,
    props: {},
    children: [text],
    flags: VNodeFlags.Text
  };
}

/**
 * 创建片段
 */
export function createFragment(props: { children?: VNode | VNode[] }): VNode {
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
export function isSameVNodeType(a: VNode, b: VNode): boolean {
  return a.type === b.type && a.key === b.key;
}

/**
 * 创建组件 VNode
 */
export function createComponent<P extends ComponentProps>(
  component: Component<P>,
  props: P
): VNode {
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
export function jsx(type: VNodeType, props: VNodeProps): VNode {
  const { children, ...rest } = props;
  return h(type as string, rest, ...(children ? [children].flat() : []));
}
