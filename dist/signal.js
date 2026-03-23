/**
 * AI Render Runtime - Signal System
 * 基于 Solid.js 的细粒度响应式系统
 */
/**
 * Signal - 响应式数据容器
 * 核心概念：值变化时，自动通知所有订阅者
 */
export class Signal {
    constructor(initialValue) {
        this.subscribers = new Set();
        this.effects = new Set();
        this.value = initialValue;
    }
    // 获取值
    get() {
        // 收集当前订阅者
        if (currentTracking) {
            this.subscribers.add(currentTracking);
        }
        return this.value;
    }
    // 设置值
    set(newValue) {
        const value = typeof newValue === 'function'
            ? newValue(this.value)
            : newValue;
        if (value !== this.value) {
            this.value = value;
            this.notify();
        }
    }
    // 更新值
    update(fn) {
        this.set(fn(this.value));
    }
    // 通知所有订阅者
    notify() {
        // 使用微任务批量更新
        batch(() => {
            this.subscribers.forEach(fn => fn());
            this.effects.forEach(fn => fn());
        });
    }
    // 订阅变化
    subscribe(fn) {
        this.subscribers.add(fn);
        return () => this.subscribers.delete(fn);
    }
    // 添加副作用
    addEffect(fn) {
        this.effects.add(fn);
        return () => this.effects.delete(fn);
    }
    // 创建计算属性
    computed(fn) {
        const signal = new Signal(fn());
        this.subscribe(() => {
            signal.set(fn());
        });
        return signal;
    }
}
/**
 * 全局追踪器
 */
let currentTracking = null;
export function track(fn) {
    const prev = currentTracking;
    currentTracking = null;
    try {
        return fn();
    }
    finally {
        currentTracking = prev;
    }
}
/**
 * Effect - 自动追踪依赖的副作用
 *
 * Uses a global WeakMap to track subscriptions without polluting prototypes.
 * This is safe for concurrent effects.
 */
// Global tracking: effect -> Set of signals it subscribed to
const effectSubscriptions = new WeakMap();
// Global tracking: signal -> Set of effects subscribed to it
const signalSubscribers = new WeakMap();
export function createEffect(fn) {
    const effect = () => {
        const prev = currentTracking;
        currentTracking = effect;
        try {
            fn();
        }
        finally {
            currentTracking = prev;
        }
    };
    // Track subscribed signals for cleanup (non-Window-compatible WeakMap requires object keys)
    const subscribedSignals = new Set();
    // Wrapper that tracks subscriptions
    const trackedEffect = () => {
        const prev = currentTracking;
        currentTracking = effect;
        subscribedSignals.clear();
        // Override Signal.get() temporarily to track subscriptions
        const originalGet = Signal.prototype.get;
        Signal.prototype.get = function () {
            if (currentTracking) {
                // Track this signal as being subscribed
                subscribedSignals.add(this);
                // Also track in global map for cross-effect cleanup
                let effects = signalSubscribers.get(this);
                if (!effects) {
                    effects = new Set();
                    signalSubscribers.set(this, effects);
                }
                effects.add(currentTracking);
                // Track in effect's local set for cleanup
                let subscribed = effectSubscriptions.get(currentTracking);
                if (!subscribed) {
                    subscribed = new Set();
                    effectSubscriptions.set(currentTracking, subscribed);
                }
                subscribed.add(this);
            }
            return originalGet.call(this);
        };
        try {
            fn();
        }
        finally {
            currentTracking = prev;
            Signal.prototype.get = originalGet;
        }
    };
    // Immediately execute to establish dependencies
    trackedEffect();
    // Return cleanup function
    return () => {
        // Unsubscribe from all tracked signals
        subscribedSignals.forEach(signal => {
            signal.subscribers.delete(effect);
            // Also clean up global tracking
            const effects = signalSubscribers.get(signal);
            if (effects) {
                effects.delete(effect);
                if (effects.size === 0) {
                    signalSubscribers.delete(signal);
                }
            }
        });
        // Clean up effect's subscription set
        const subscribed = effectSubscriptions.get(effect);
        if (subscribed) {
            effectSubscriptions.delete(effect);
        }
        subscribedSignals.clear();
    };
}
/**
 * Batch - 批量更新
 */
let batchQueue = new Set();
let isBatching = false;
export function batch(fn) {
    if (isBatching) {
        fn();
    }
    else {
        isBatching = true;
        try {
            fn();
        }
        finally {
            isBatching = false;
            // 执行队列中的所有 effect
            flush();
        }
    }
}
function flush() {
    batchQueue.forEach(fn => fn());
    batchQueue.clear();
}
/**
 * Memo - 记忆化计算
 */
export function memo(fn) {
    const signal = new Signal(undefined);
    createEffect(() => {
        signal.set(fn());
    });
    return signal;
}
/**
 * 创建响应式状态
 */
export function createSignal(initialValue) {
    const signal = new Signal(initialValue);
    return [signal.get.bind(signal), signal.set.bind(signal)];
}
/**
 * 创建响应式数组
 */
export function createArraySignal(initialValue) {
    const signal = new Signal(initialValue);
    return {
        signal,
        push: (item) => {
            signal.update(arr => [...arr, item]);
        },
        pop: () => {
            let result;
            signal.update(arr => {
                result = arr[arr.length - 1];
                return arr.slice(0, -1);
            });
            return result;
        },
        splice: (index, deleteCount, ...items) => {
            let result = [];
            signal.update(arr => {
                result = arr.splice(index, deleteCount, ...items);
                return [...arr];
            });
            return result;
        },
        update: (index, item) => {
            signal.update(arr => {
                const newArr = [...arr];
                newArr[index] = item;
                return newArr;
            });
        },
        remove: (index) => {
            let result;
            signal.update(arr => {
                result = arr[index];
                return arr.filter((_, i) => i !== index);
            });
            return result;
        }
    };
}
//# sourceMappingURL=signal.js.map