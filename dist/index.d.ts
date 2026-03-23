/**
 * AI Render Runtime
 * 下一代 AI 驱动的声明式 UI 渲染引擎
 */
import { Signal, createSignal, createArraySignal, createEffect, batch, track, createWatch, watch, WatchOptions, WatchStopHandle, createLazyComputed, ComputedSignal } from './signal';
import { h, t, Fragment, createComponent, Component, ComponentProps, enableStaticHoisting, disableStaticHoisting } from './vdom';
import { diff, batchDiff, reconcile, Patch, PatchType } from './diff';
import { jsx } from './jsx';
import { registry, ComponentSpec, RenderFn } from './registry';
import { Renderer, createRenderer, mount } from './renderer';
import { SYSTEM_PROMPT, AIConfig, AIResponse } from './prompts';
import { AIProvider, callAI, parseAIResponse } from './ai-adapter';
import { scheduleCallback, runWithPriority, getCurrentPriority, Priority, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority } from './scheduler';
import { StateStore } from './state-store';
import { IntentEngine, Intent } from './intent-engine';
import { ActionEngine } from './action-engine';
import { RenderOrchestrator } from './render-orchestrator';
import { PlatformAdapter } from './platform-adapter';
import { Spec, ActionSpec } from './spec-contract';
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
    currentSpec: Spec | null;
    stateStore: StateStore;
    intentEngine: IntentEngine;
    actionEngine: ActionEngine;
    orchestrator: RenderOrchestrator;
    adapter: PlatformAdapter;
    constructor(options: {
        container: Element | string;
        initialSpec?: any | any[];
        enableHistory?: boolean;
    });
    processIntent(intent: Intent): Promise<Spec | null>;
    executeAction(action: ActionSpec): Promise<boolean>;
    saveSnapshot(label?: string): string;
    restore(snapshotId: string): boolean;
    undo(): boolean;
    getHistory(): any[];
    onStateChange(callback: (spec: any) => void): () => void;
    render(spec: any): void;
    update(spec: any): void;
    register(name: string, fn: (spec: any, render: (spec: any) => any) => any): void;
    getSpec(): Spec | null;
    destroy(): void;
}
export declare class AIGenRender {
    air: AIRender;
    options: AIGenOptions;
    constructor(options: AIGenOptions);
    generate(userPrompt: string): Promise<void>;
    render(spec: any): void;
}
export { registry, ComponentSpec, RenderFn };
export { SYSTEM_PROMPT, AIConfig, AIResponse };
export { AIProvider, callAI, parseAIResponse };
export { Signal, createSignal, createArraySignal, createEffect, batch, track, createWatch, watch, WatchOptions, WatchStopHandle, createLazyComputed, ComputedSignal };
export { h, t, Fragment, createComponent, jsx, enableStaticHoisting, disableStaticHoisting };
export { Component, ComponentProps };
export { diff, batchDiff, reconcile, Patch, PatchType };
export { Renderer, createRenderer, mount };
export { scheduleCallback, runWithPriority, getCurrentPriority, Priority, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority };
export { memo, useMemo, useCallback, isMemoized } from './memo';
export { ref, useRef, forwardRef, Ref, RefCallback } from './refs';
export { onMounted, onUpdated, onUnmounted, onBeforeMount, onBeforeUpdate, onBeforeUnmount } from './lifecycle';
export { KeepAlive, getKeepAliveCache, clearKeepAliveCache } from './keep-alive';
export { defineAsyncComponent, markAsyncComponent, isAsyncComponent, getSuspenseState } from './suspense';
export { ErrorBoundary, componentDidCatch, ErrorInfo, ErrorBoundaryState } from './error-boundary';
export { createContext, useContext, pushContext, popContext, Context, provide, inject, InjectionKey, createInjectionKey } from './context';
export { reactive, ref as reactiveRef, computed, watchEffect, isRef, watchProxy } from './reactive';
export { createAIStream, createIntentRouter, AIStream, IntentRouter, AIStreamState, AIStreamConfig } from './ai-stream';
export { Spec, SpecMeta, ViewSpec, LayoutSpec, ActionSpec, ActionType, createSpec, SPEC_VERSION } from './spec-contract';
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