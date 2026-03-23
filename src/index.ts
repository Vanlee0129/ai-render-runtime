/**
 * AI Render Runtime
 * 下一代 AI 驱动的声明式 UI 渲染引擎
 */

// 导入依赖
import { Signal, createSignal, createArraySignal, createEffect, batch, track, createWatch, watch, WatchOptions, WatchStopHandle, createLazyComputed, ComputedSignal } from './signal';
import { h, t, Fragment, createComponent, Component, ComponentProps, enableStaticHoisting, disableStaticHoisting } from './vdom';
import { diff, batchDiff, reconcile, Patch, PatchType } from './diff';
import { jsx, Fragment as JsxFragment } from './jsx';
import { registry, ComponentSpec, RenderFn } from './registry';
import { Renderer, createRenderer, mount } from './renderer';
import { SYSTEM_PROMPT, AIConfig, AIResponse } from './prompts';
import { AIProvider, callAI, parseAIResponse } from './ai-adapter';
import { scheduleCallback, runWithPriority, getCurrentPriority, Priority, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority } from './scheduler';
import { StateStore } from './state-store';
import { IntentEngine, Intent, IntentContext } from './intent-engine';
import { ActionEngine } from './action-engine';
import { RenderOrchestrator } from './render-orchestrator';
import { PlatformAdapter, createPlatformAdapter } from './platform-adapter';
import { Spec, ActionSpec } from './spec-contract';

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
  currentSpec: Spec | null = null;
  stateStore: StateStore;
  intentEngine: IntentEngine;
  actionEngine: ActionEngine;
  orchestrator: RenderOrchestrator;
  adapter: PlatformAdapter;

  constructor(options: { container: Element | string; initialSpec?: any | any[]; enableHistory?: boolean }) {
    this.container = typeof options.container === 'string'
      ? document.querySelector(options.container)!
      : options.container;

    this.renderer = new Renderer(this.container);
    this.stateStore = new StateStore();
    this.intentEngine = new IntentEngine();
    this.actionEngine = new ActionEngine();
    this.orchestrator = new RenderOrchestrator(this.renderer);
    this.adapter = createPlatformAdapter(this.container);

    if (options.initialSpec) {
      this.render(options.initialSpec);
    }
  }

  async processIntent(intent: Intent): Promise<Spec | null> {
    const context: IntentContext = {
      state: this.currentSpec?.state || {},
      history: [],
    };
    const result = await this.intentEngine.process(intent, context);
    if (result.spec) {
      this.render(result.spec);
      return result.spec;
    }
    return null;
  }

  async executeAction(action: ActionSpec): Promise<boolean> {
    const result = await this.actionEngine.execute(action);
    if (result.success && result.nextIntent) {
      const intent: Intent = {
        type: result.nextIntent,
        confidence: 1.0,
        entities: { previousAction: action },
      };
      await this.processIntent(intent);
    }
    return result.success;
  }

  saveSnapshot(label?: string): string {
    return this.stateStore.saveSnapshot(label);
  }

  restore(snapshotId: string): boolean {
    const spec = this.stateStore.getSnapshot(snapshotId)?.spec;
    if (spec) {
      this.render(spec);
      return true;
    }
    return false;
  }

  undo(): boolean {
    const success = this.stateStore.undo();
    if (success) {
      const spec = this.stateStore.getState();
      if (spec) {
        this.render(spec);
      }
    }
    return success;
  }

  getHistory(): any[] {
    return this.stateStore.getHistory().map(s => s.spec);
  }

  onStateChange(callback: (spec: any) => void): () => void {
    return this.stateStore.subscribe(callback);
  }

  render(spec: any) {
    this.currentSpec = spec;

    // Only clear innerHTML if not hydrating and context.dom is not already null
    // This preserves SSR-rendered DOM during hydration
    if (!(this.renderer as any).isHydrating && (this.renderer as any).context.dom !== null) {
      this.container.innerHTML = '';
      // 重置渲染器状态，避免第二次渲染时 context.dom 指向已删除的节点
      (this.renderer as any).context.dom = null;
      (this.renderer as any).context.vnode = null;
    }

    const vnode = registry.render(spec);

    if (!vnode) return;

    this.renderer.render(vnode);
  }

  update(spec: any) {
    this.render(spec);
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

// AI 驱动的渲染器
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

// ============ AI Native 核心 ============
export { registry, ComponentSpec, RenderFn };
export { SYSTEM_PROMPT, AIConfig, AIResponse };
export { AIProvider, callAI, parseAIResponse };

// ============ 响应式 ============
export { Signal, createSignal, createArraySignal, createEffect, batch, track, createWatch, watch, WatchOptions, WatchStopHandle, createLazyComputed, ComputedSignal };

// ============ 虚拟 DOM ============
export { h, t, Fragment, createComponent, jsx, enableStaticHoisting, disableStaticHoisting };
export { Component, ComponentProps };

// ============ Diff ============
export { diff, batchDiff, reconcile, Patch, PatchType };

// ============ 渲染器 ============
export { Renderer, createRenderer, mount };

// ============ 调度器 ============
export { scheduleCallback, runWithPriority, getCurrentPriority, Priority, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority };

// ============ 组件 ============
export { memo, useMemo, useCallback, isMemoized } from './memo';
export { ref, useRef, forwardRef, Ref, RefCallback } from './refs';
export { onMounted, onUpdated, onUnmounted, onBeforeMount, onBeforeUpdate, onBeforeUnmount } from './lifecycle';
export { KeepAlive, getKeepAliveCache, clearKeepAliveCache } from './keep-alive';
export { defineAsyncComponent, markAsyncComponent, isAsyncComponent, getSuspenseState } from './suspense';
export { ErrorBoundary, componentDidCatch, ErrorInfo, ErrorBoundaryState } from './error-boundary';

// ============ 上下文 ============
export { createContext, useContext, pushContext, popContext, Context, provide, inject, InjectionKey, createInjectionKey } from './context';

// ============ 响应式对象 ============
export { reactive, ref as reactiveRef, computed, watchEffect, isRef, watchProxy } from './reactive';

// ============ AI Stream & Intent ============
export { createAIStream, createIntentRouter, AIStream, IntentRouter, AIStreamState, AIStreamConfig } from './ai-stream';

// ============ Spec Contract ============
export { Spec, SpecMeta, ViewSpec, LayoutSpec, ActionSpec, ActionType, createSpec, SPEC_VERSION } from './spec-contract';

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
