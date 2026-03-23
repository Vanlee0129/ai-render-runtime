/**
 * AI Render Runtime
 * 下一代 AI 驱动的声明式 UI 渲染引擎
 */

// 导入依赖
import { Signal, createSignal, createArraySignal, createEffect, batch, track } from './signal';
import { h, t, Fragment, createComponent, Component, ComponentProps } from './vdom';
import { diff, batchDiff, reconcile, Patch, PatchType } from './diff';
import { jsx, createElement, Fragment as JsxFragment } from './jsx';
import { registry, ComponentSpec, RenderFn } from './registry';
import { Renderer, createRenderer, mount } from './renderer';
import { SYSTEM_PROMPT, AIConfig, AIResponse } from './prompts';
import { AIProvider, callAI, parseAIResponse } from './ai-adapter';
import { scheduleCallback, runWithPriority, getCurrentPriority, Priority, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority } from './scheduler';

// AI 驱动的渲染选项
export interface AIGenOptions {
  container: Element | string;
  apiKey: string;
  provider?: AIProvider;
  apiUrl?: string;
  model?: string;
  onSpecGenerated?: (spec: any) => void;
  onError?: (error: string) => void;
}

// 主入口类
export class AIRender {
  renderer: Renderer;
  container: Element;
  currentSpec: any[] = [];
  
  constructor(options: { container: Element | string; initialSpec?: any | any[] }) {
    this.container = typeof options.container === 'string' 
      ? document.querySelector(options.container)! 
      : options.container;
    
    this.renderer = new Renderer(this.container);
    
    if (options.initialSpec) {
      this.render(options.initialSpec);
    }
  }
  
  render(specs: any | any[]) {
    const specArray = Array.isArray(specs) ? specs : [specs];
    this.currentSpec = specArray;
    
    this.container.innerHTML = '';
    // 重置渲染器状态，避免第二次渲染时 context.dom 指向已删除的节点
    (this.renderer as any).context.dom = null;
    (this.renderer as any).context.vnode = null;
    
    const vnodes: any[] = specArray.map(spec => registry.render(spec));
    
    if (vnodes.length === 0) return;
    
    if (vnodes.length === 1) {
      this.renderer.render(vnodes[0]);
    } else {
      const fragment = h('div', { class: 'gen-root' }, ...vnodes);
      this.renderer.render(fragment);
    }
  }
  
  update(specs: any | any[]) {
    this.render(specs);
  }
  
  register(name: string, fn: (spec: any, render: (spec: any) => any) => any) {
    registry.register(name, fn);
  }
  
  getSpec() {
    return this.currentSpec;
  }
  
  destroy() {
    this.renderer.destroy();
  }
}

// AI 驱动的渲染器 - 定义在 AIRender 之后
export class AIGenRender {
  air: AIRender;
  options: AIGenOptions;
  
  constructor(options: AIGenOptions) {
    this.options = options;
    this.air = new AIRender({ container: options.container });
  }
  
  async generate(userPrompt: string) {
    const { provider = 'minimax', onSpecGenerated, onError } = this.options;
    
    try {
      const response = await callAI(provider, {
        apiKey: this.options.apiKey,
        apiUrl: this.options.apiUrl,
        model: this.options.model
      }, userPrompt);
      
      if (response.error) {
        onError?.(response.error);
        return;
      }
      
      const spec = parseAIResponse(response.content);
      onSpecGenerated?.(spec);
      this.air.render(spec);
    } catch (e: any) {
      onError?.(e.message);
    }
  }
  
  render(spec: any) {
    this.air.render(spec);
  }
}

// 导出供外部使用
export { Signal, createSignal, createArraySignal, createEffect, batch, track };
export { h, t, Fragment, createComponent, jsx, createElement };
export { diff, batchDiff, reconcile, Patch, PatchType };
export { registry, ComponentSpec, RenderFn };
export { SYSTEM_PROMPT, AIConfig, AIResponse } from './prompts';
export { AIProvider, callAI, parseAIResponse } from './ai-adapter';
export { Renderer, createRenderer, mount };
export { scheduleCallback, runWithPriority, getCurrentPriority, Priority, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority };
export { memo, useMemo, useCallback, isMemoized } from './memo';
export type { Component, ComponentProps };

// 便捷函数
export function createAIRender(container: Element | string, initialSpec?: any | any[]) {
  return new AIRender({ container, initialSpec });
}

export function createAIGen(options: AIGenOptions) {
  return new AIGenRender(options);
}

export function render(specs: any | any[], container: Element | string) {
  return new AIRender({ container, initialSpec: specs });
}

export async function generate(
  userPrompt: string, 
  container: Element | string, 
  apiKey: string,
  options?: { provider?: AIProvider; apiUrl?: string; model?: string }
) {
  const gen = createAIGen({ container, apiKey, ...options });
  await gen.generate(userPrompt);
  return gen;
}

export default AIRender;