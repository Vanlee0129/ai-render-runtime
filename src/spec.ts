/**
 * AI Render Runtime - Spec Parser (兼容层)
 * 
 * 现在组件定义在 components/*.md
 * 此文件提供与旧版 API 的兼容
 */

import { VNode, h } from './vdom';
import { registry, ComponentSpec } from './registry';

export interface Spec extends ComponentSpec {}
export { ComponentSpec };

/**
 * 解析 Spec - 使用 registry
 */
export function parseSpec(spec: Spec | Spec[]): VNode | VNode[] {
  if (Array.isArray(spec)) {
    return spec.map(s => registry.render(s));
  }
  return registry.render(spec);
}

/**
 * Spec Parser 类 - 已废弃，使用 registry 代替
 * @deprecated 使用 registry.render() 代替
 */
export class SpecParser {
  parse(spec: Spec | Spec[]): VNode | VNode[] {
    return parseSpec(spec);
  }
  parseOne(spec: Spec): VNode {
    return registry.render(spec);
  }
}

/**
 * 便捷函数
 */
export function parseSpecs(specs: Spec[]): VNode[] {
  return specs.map(s => registry.render(s));
}
