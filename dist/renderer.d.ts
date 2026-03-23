/**
 * AI Render Runtime - Renderer
 * 核心渲染引擎
 */
import { VNode } from './vdom';
import { Signal } from './signal';
type EventHandler = (e: Event) => void;
declare global {
    interface Element {
        _eventHandlers?: Map<string, EventHandler>;
    }
}
export interface RenderOptions {
    container: Element;
    sync?: boolean;
    hydrate?: boolean;
}
/**
 * 渲染上下文
 */
export interface RenderContext {
    container: Element;
    vnode: VNode | null;
    dom: Element | Text | Comment | null;
    signals: Map<string, Signal<any>>;
}
/**
 * 渲染器类
 */
export declare class Renderer {
    private context;
    private pendingUpdates;
    private isRendering;
    private boundHandlers;
    private isHydrating;
    private renderId;
    constructor(container: Element);
    /**
     * 设置事件委托（每个容器独立）
     */
    private setupEventDelegation;
    /**
     * 标记为 hydration 模式
     */
    setHydrating(value: boolean): void;
    /**
     * 渲染虚拟节点到 DOM
     */
    render(vnode: VNode | null): void;
    /**
     * Hydrate - SSR 场景：复用已有 DOM，绑定事件
     * 增强版：更精确的 DOM 复用和匹配
     */
    hydrate(vnode: VNode): void;
    /**
     * 递归 hydrate 树
     */
    private hydrateTree;
    /**
     * hydrate Fragment
     */
    private hydrateFragment;
    /**
     * hydrate 组件
     */
    private hydrateComponent;
    /**
     * hydrate 元素属性和事件
     */
    private hydrateElementProps;
    /**
     * hydrate 子节点
     */
    private hydrateChildren;
    /**
     * 创建 DOM 节点
     */
    private createDom;
    /**
     * 创建组件 DOM
     */
    private createComponentDom;
    /**
     * 设置属性
     */
    private setProps;
    /**
     * 添加子节点
     */
    private appendChildren;
    /**
     * 卸载
     */
    private unmount;
    /**
     * 补丁更新
     */
    private patch;
    /**
     * 更新属性
     */
    private updateProps;
    /**
     * 更新子节点
     */
    private updateChildren;
    private updateChildrenSimple;
    private applyPatches;
    /**
     * 获取信号
     */
    getSignal<T>(key: string): Signal<T> | undefined;
    /**
     * 设置信号
     */
    setSignal<T>(key: string, signal: Signal<T>): void;
    /**
     * Schedule a non-blocking update using Fiber
     */
    scheduleUpdate(callback: () => void): void;
    /**
     * 销毁
     */
    destroy(): void;
}
/**
 * 创建渲染器
 */
export declare function createRenderer(container: Element): Renderer;
/**
 * 挂载到容器
 */
export declare function mount(vnode: VNode, container: Element | string): Renderer;
/**
 * Hydrate - 在已有 DOM 上绑定事件
 * 用于 SSR 后的客户端接管
 */
export declare function hydrate(vnode: VNode, container: Element | string): Renderer;
export {};
//# sourceMappingURL=renderer.d.ts.map