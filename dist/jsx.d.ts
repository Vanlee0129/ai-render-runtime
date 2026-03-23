/**
 * AI Render Runtime - JSX Support
 * 提供 h() 和 Fragment 作为 JSX pragma
 */
import { h, t, createFragment, VNode, VNodeType, VNodeProps } from './vdom';
export declare function jsx(type: VNodeType, props: VNodeProps, key?: string | number): VNode;
export declare const Fragment: typeof createFragment;
declare global {
    namespace JSX {
        interface Element extends VNode {
        }
        interface IntrinsicElements {
            [elemName: string]: VNodeProps;
        }
    }
}
export { h as createElement };
export { t as text };
//# sourceMappingURL=jsx.d.ts.map