/**
 * AI Render Runtime - Spec Parser (兼容层)
 *
 * 现在组件定义在 components/*.md
 * 此文件提供与旧版 API 的兼容
 */
import { VNode } from './vdom';
import { ComponentSpec } from './registry';
export interface Spec extends ComponentSpec {
}
export { ComponentSpec };
/**
 * 解析 Spec - 使用 registry
 */
export declare function parseSpec(spec: Spec | Spec[]): VNode | VNode[];
/**
 * Spec Parser 类 - 已废弃，使用 registry 代替
 * @deprecated 使用 registry.render() 代替
 */
export declare class SpecParser {
    parse(spec: Spec | Spec[]): VNode | VNode[];
    parseOne(spec: Spec): VNode;
}
/**
 * 便捷函数
 */
export declare function parseSpecs(specs: Spec[]): VNode[];
//# sourceMappingURL=spec.d.ts.map