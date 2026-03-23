/**
 * AI Render Runtime
 * 下一代 AI 驱动的声明式 UI 渲染引擎
 */
import { Signal, createSignal, createArraySignal, createEffect, batch, track } from './signal';
import { h, t, Fragment, createComponent, Component, ComponentProps } from './vdom';
import { diff, batchDiff, reconcile, Patch, PatchType } from './diff';
import { jsx, createElement } from './jsx';
import { registry, ComponentSpec, RenderFn } from './registry';
import { Renderer, createRenderer, mount } from './renderer';
import { AIProvider } from './ai-adapter';
import { scheduleCallback, runWithPriority, getCurrentPriority, Priority, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority } from './scheduler';
export interface AIGenOptions {
    container: Element | string;
    apiKey: string;
    provider?: AIProvider;
    apiUrl?: string;
    model?: string;
    onSpecGenerated?: (spec: any) => void;
    onError?: (error: string) => void;
}
export declare class AIRender {
    renderer: Renderer;
    container: Element;
    currentSpec: any[];
    constructor(options: {
        container: Element | string;
        initialSpec?: any | any[];
    });
    render(specs: any | any[]): void;
    update(specs: any | any[]): void;
    register(name: string, fn: (spec: any, render: (spec: any) => any) => any): void;
    getSpec(): any[];
    destroy(): void;
}
export declare class AIGenRender {
    air: AIRender;
    options: AIGenOptions;
    constructor(options: AIGenOptions);
    generate(userPrompt: string): Promise<void>;
    render(spec: any): void;
}
export { Signal, createSignal, createArraySignal, createEffect, batch, track };
export { h, t, Fragment, createComponent, jsx, createElement };
export { diff, batchDiff, reconcile, Patch, PatchType };
export { registry, ComponentSpec, RenderFn };
export { SYSTEM_PROMPT, AIConfig, AIResponse } from './prompts';
export { AIProvider, callAI, parseAIResponse } from './ai-adapter';
export { Renderer, createRenderer, mount };
export { scheduleCallback, runWithPriority, getCurrentPriority, Priority, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority };
export { memo, useMemo, useCallback, isMemoized } from './memo';
export { createContext, useContext, pushContext, popContext, Context } from './context';
export { ErrorBoundary, componentDidCatch, ErrorInfo, ErrorBoundaryState } from './error-boundary';
export { ref, useRef, forwardRef, Ref, RefCallback } from './refs';
export type { Component, ComponentProps };
export declare function createAIRender(container: Element | string, initialSpec?: any | any[]): AIRender;
export declare function createAIGen(options: AIGenOptions): AIGenRender;
export declare function render(specs: any | any[], container: Element | string): AIRender;
export declare function generate(userPrompt: string, container: Element | string, apiKey: string, options?: {
    provider?: AIProvider;
    apiUrl?: string;
    model?: string;
}): Promise<AIGenRender>;
export default AIRender;
//# sourceMappingURL=index.d.ts.map