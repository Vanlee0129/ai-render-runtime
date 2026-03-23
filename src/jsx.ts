/**
 * AI Render Runtime - JSX Support
 * 提供 h() 和 Fragment 作为 JSX pragma
 */

import { h, t, createFragment, VNode, VNodeType, VNodeProps } from './vdom';

// JSX 元素工厂函数
export function jsx(type: VNodeType, props: VNodeProps, key?: string | number): VNode {
  const { children, ...rest } = props;
  
  // 处理 key
  const vnode = h(
    type as string, 
    key !== undefined ? { ...rest, key } : rest,
    ...(Array.isArray(children) ? children.flat() : children ? [children] : [])
  );
  
  return vnode;
}

// JSX Fragment 工厂 - re-export createFragment from vdom as Fragment
export const Fragment = createFragment;

// 类型声明（供 tsconfig 使用）
declare global {
  namespace JSX {
    interface Element extends VNode {}
    interface IntrinsicElements {
      [elemName: string]: VNodeProps;
    }
  }
}

// 导出 h 作为默认 pragma
export { h as createElement };
export { t as text };
