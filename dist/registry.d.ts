/**
 * AI Render Runtime - Component Registry
 * 轻量级组件注册表
 */
import { VNode } from './vdom';
import { Spec } from './spec-contract';
export declare function wrapToSpec(spec: ComponentSpec | ComponentSpec[], intent?: string): Spec;
export interface ComponentSpec {
    type: string;
    [key: string]: any;
}
export type RenderFn = (spec: ComponentSpec, render: (spec: ComponentSpec) => VNode) => VNode;
declare class ComponentRegistry {
    private renderers;
    constructor();
    private safeArray;
    private registerDefaultRenderers;
    register(type: string, fn: RenderFn): void;
    get(type: string): RenderFn | undefined;
    render(spec: ComponentSpec): VNode;
}
export declare const registry: ComponentRegistry;
export {};
//# sourceMappingURL=registry.d.ts.map