/**
 * AI Render Runtime
 * 下一代 AI 驱动的声明式 UI 渲染引擎
 */
// 导入依赖
import { Signal, createSignal, createArraySignal, createEffect, batch, track, createWatch, watch, createLazyComputed, ComputedSignal } from './signal';
import { h, t, Fragment, createComponent, enableStaticHoisting, disableStaticHoisting } from './vdom';
import { diff, batchDiff, reconcile, PatchType } from './diff';
import { jsx } from './jsx';
import { registry } from './registry';
import { Renderer, createRenderer, mount } from './renderer';
import { SYSTEM_PROMPT } from './prompts';
import { callAI, parseAIResponse } from './ai-adapter';
import { scheduleCallback, runWithPriority, getCurrentPriority, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority } from './scheduler';
import { StateStore } from './state-store';
import { IntentEngine } from './intent-engine';
import { ActionEngine } from './action-engine';
import { RenderOrchestrator } from './render-orchestrator';
import { createPlatformAdapter } from './platform-adapter';
// 主入口类
export class AIRender {
    constructor(options) {
        this.currentSpec = null;
        this.container = typeof options.container === 'string'
            ? document.querySelector(options.container)
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
    async processIntent(intent) {
        const context = {
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
    async executeAction(action) {
        const result = await this.actionEngine.execute(action);
        if (result.success && result.nextIntent) {
            const intent = {
                type: result.nextIntent,
                confidence: 1.0,
                entities: { previousAction: action },
            };
            await this.processIntent(intent);
        }
        return result.success;
    }
    saveSnapshot(label) {
        return this.stateStore.saveSnapshot(label);
    }
    restore(snapshotId) {
        const spec = this.stateStore.getSnapshot(snapshotId)?.spec;
        if (spec) {
            this.render(spec);
            return true;
        }
        return false;
    }
    undo() {
        const success = this.stateStore.undo();
        if (success) {
            const spec = this.stateStore.getState();
            if (spec) {
                this.render(spec);
            }
        }
        return success;
    }
    getHistory() {
        return this.stateStore.getHistory().map(s => s.spec);
    }
    onStateChange(callback) {
        return this.stateStore.subscribe(callback);
    }
    render(spec) {
        this.currentSpec = spec;
        // Only clear innerHTML if not hydrating and context.dom is not already null
        // This preserves SSR-rendered DOM during hydration
        if (!this.renderer.isHydrating && this.renderer.context.dom !== null) {
            this.container.innerHTML = '';
            // 重置渲染器状态，避免第二次渲染时 context.dom 指向已删除的节点
            this.renderer.context.dom = null;
            this.renderer.context.vnode = null;
        }
        const vnode = registry.render(spec);
        if (!vnode)
            return;
        this.renderer.render(vnode);
    }
    update(spec) {
        this.render(spec);
    }
    register(name, fn) {
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
    constructor(options) {
        this.options = options;
        this.air = new AIRender({ container: options.container });
    }
    async generate(userPrompt) {
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
        }
        catch (e) {
            onError?.(e.message);
        }
    }
    render(spec) {
        this.air.render(spec);
    }
}
// ============ AI Native 核心 ============
export { registry };
export { SYSTEM_PROMPT };
export { callAI, parseAIResponse };
// ============ 响应式 ============
export { Signal, createSignal, createArraySignal, createEffect, batch, track, createWatch, watch, createLazyComputed, ComputedSignal };
// ============ 虚拟 DOM ============
export { h, t, Fragment, createComponent, jsx, enableStaticHoisting, disableStaticHoisting };
// ============ Diff ============
export { diff, batchDiff, reconcile, PatchType };
// ============ 渲染器 ============
export { Renderer, createRenderer, mount };
// ============ 调度器 ============
export { scheduleCallback, runWithPriority, getCurrentPriority, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority };
// ============ 组件 ============
export { memo, useMemo, useCallback, isMemoized } from './memo';
export { ref, useRef, forwardRef } from './refs';
export { onMounted, onUpdated, onUnmounted, onBeforeMount, onBeforeUpdate, onBeforeUnmount } from './lifecycle';
export { KeepAlive, getKeepAliveCache, clearKeepAliveCache } from './keep-alive';
export { defineAsyncComponent, markAsyncComponent, isAsyncComponent, getSuspenseState } from './suspense';
export { ErrorBoundary, componentDidCatch } from './error-boundary';
// ============ 上下文 ============
export { createContext, useContext, pushContext, popContext, provide, inject, createInjectionKey } from './context';
// ============ 响应式对象 ============
export { reactive, ref as reactiveRef, computed, watchEffect, isRef, watchProxy } from './reactive';
// ============ AI Stream & Intent ============
export { createAIStream, createIntentRouter, AIStream, IntentRouter } from './ai-stream';
// ============ Spec Contract ============
export { createSpec, SPEC_VERSION } from './spec-contract';
// 便捷函数
export function createAIRender(container, initialSpec) {
    return new AIRender({ container, initialSpec });
}
export function createAIGen(options) {
    return new AIGenRender(options);
}
export function render(specs, container) {
    return new AIRender({ container, initialSpec: specs });
}
export async function generate(userPrompt, container, apiKey, options) {
    const gen = createAIGen({ container, apiKey, ...options });
    await gen.generate(userPrompt);
    return gen;
}
export default AIRender;
//# sourceMappingURL=index.js.map