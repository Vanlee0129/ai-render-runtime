import { ComponentSpec } from './registry';

export const SPEC_VERSION = '1.0';

/**
 * 完整 Spec 契约 - AI Runtime 的核心数据类型
 */
export interface Spec {
  version: string;           // 契约版本，用于向后兼容
  intent: string;            // Intent 类型
  view: ViewSpec;            // 视图描述
  actions: ActionSpec[];     // 可用动作
  state: Record<string, any>; // 视图状态
  meta: SpecMeta;            // 元信息
}

/**
 * Spec 元信息
 */
export interface SpecMeta {
  createdAt: string;        // 创建时间 ISO 8601
  confidence: number;       // AI 置信度 0-1
  streaming: boolean;        // 是否流式生成
  source?: string;           // 来源标识
}

/**
 * 视图规格
 */
export interface ViewSpec {
  type: string;              // dashboard, list, form, custom
  layout?: LayoutSpec;       // 布局信息
  components: ComponentSpec[]; // 组件列表
}

/**
 * 布局规格
 */
export interface LayoutSpec {
  type: 'grid' | 'flex' | 'stack' | 'absolute';
  columns?: number;
  rows?: number;
  gap?: number;
  direction?: 'row' | 'column';
}

/**
 * 动作规格
 */
export interface ActionSpec {
  id: string;                // 唯一标识
  type: ActionType;          // 动作类型
  payload?: any;             // 负载
  label?: string;            // 显示标签
  disabled?: boolean;         // 是否禁用
  nextIntent?: string;       // 执行后可能的下一个 Intent
}

export type ActionType = 'navigation' | 'api' | 'mutation' | 'custom';

/**
 * 创建 Spec 的工厂函数
 */
export function createSpec(intent: string, view: ViewSpec, options?: Partial<Spec>): Spec {
  return {
    version: SPEC_VERSION,
    intent,
    view,
    actions: options?.actions || [],
    state: options?.state || {},
    meta: {
      createdAt: new Date().toISOString(),
      confidence: options?.meta?.confidence ?? 1.0,
      streaming: options?.meta?.streaming ?? false,
      source: options?.meta?.source,
    },
  };
}
