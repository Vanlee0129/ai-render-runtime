/**
 * AI Render Runtime - Signal System
 * 基于 Solid.js 的细粒度响应式系统
 */
type Subscriber = () => void;
type Effect = () => void;
/**
 * Signal - 响应式数据容器
 * 核心概念：值变化时，自动通知所有订阅者
 */
export declare class Signal<T> {
    private value;
    subscribers: Set<Subscriber>;
    private effects;
    constructor(initialValue: T);
    get(): T;
    set(newValue: T | ((prev: T) => T)): void;
    update(fn: (prev: T) => T): void;
    private notify;
    subscribe(fn: Subscriber): () => void;
    addEffect(fn: Effect): () => void;
    computed<T>(fn: () => T): Signal<T>;
}
export declare function track<T>(fn: () => T): T;
export declare function createEffect(fn: Effect): () => void;
export declare function batch(fn: () => void): void;
/**
 * Memo - 记忆化计算
 */
export declare function memo<T>(fn: () => T): Signal<T>;
/**
 * 创建响应式状态
 */
export declare function createSignal<T>(initialValue: T): [() => T, (value: T | ((prev: T) => T)) => void];
/**
 * 创建响应式数组
 */
export declare function createArraySignal<T>(initialValue: T[]): {
    signal: Signal<T[]>;
    push: (item: T) => void;
    pop: () => T | undefined;
    splice: (index: number, deleteCount: number, ...items: T[]) => T[];
    update: (index: number, item: T) => void;
    remove: (index: number) => T;
};
/**
 * 导出类型
 */
export type { Subscriber, Effect };
//# sourceMappingURL=signal.d.ts.map