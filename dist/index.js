/**
 * AI Render Runtime
 * 下一代 AI 驱动的声明式 UI 渲染引擎
 */
// 导入依赖
import { Signal, createSignal, createArraySignal, createEffect, batch, track } from './signal';
import { h, t, Fragment, createComponent } from './vdom';
import { diff, batchDiff, reconcile, PatchType } from './diff';
import { jsx, createElement } from './jsx';
import { registry } from './registry';
import { Renderer, createRenderer, mount } from './renderer';
import { callAI, parseAIResponse } from './ai-adapter';
import { scheduleCallback, runWithPriority, getCurrentPriority, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority } from './scheduler';
// 主入口类
export class AIRender {
    constructor(options) {
        this.currentSpec = [];
        this.container = typeof options.container === 'string'
            ? document.querySelector(options.container)
            : options.container;
        this.renderer = new Renderer(this.container);
        if (options.initialSpec) {
            this.render(options.initialSpec);
        }
    }
    render(specs) {
        const specArray = Array.isArray(specs) ? specs : [specs];
        this.currentSpec = specArray;
        this.container.innerHTML = '';
        // 重置渲染器状态，避免第二次渲染时 context.dom 指向已删除的节点
        this.renderer.context.dom = null;
        this.renderer.context.vnode = null;
        const vnodes = specArray.map(spec => registry.render(spec));
        if (vnodes.length === 0)
            return;
        if (vnodes.length === 1) {
            this.renderer.render(vnodes[0]);
        }
        else {
            const fragment = h('div', { class: 'gen-root' }, ...vnodes);
            this.renderer.render(fragment);
        }
    }
    update(specs) {
        this.render(specs);
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
// AI 驱动的渲染器 - 定义在 AIRender 之后
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
// 导出供外部使用
export { Signal, createSignal, createArraySignal, createEffect, batch, track };
export { h, t, Fragment, createComponent, jsx, createElement };
export { diff, batchDiff, reconcile, PatchType };
export { registry };
export { SYSTEM_PROMPT } from './prompts';
export { callAI, parseAIResponse } from './ai-adapter';
export { Renderer, createRenderer, mount };
export { scheduleCallback, runWithPriority, getCurrentPriority, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority };
export { memo, useMemo, useCallback, isMemoized } from './memo';
export { createContext, useContext, pushContext, popContext } from './context';
export { ErrorBoundary, componentDidCatch } from './error-boundary';
export { ref, useRef, forwardRef } from './refs';
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