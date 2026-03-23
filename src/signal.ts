/**
 * AI Render Runtime - Signal System
 * 基于 Solid.js 的细粒度响应式系统
 */

// 订阅者函数类型
type Subscriber = () => void;

// 效果函数类型
type Effect = () => void;

/**
 * Signal - 响应式数据容器
 * 核心概念：值变化时，自动通知所有订阅者
 */
export class Signal<T> {
  private value: T;
  subscribers: Set<Subscriber> = new Set();
  private effects: Set<Effect> = new Set();
  
  constructor(initialValue: T) {
    this.value = initialValue;
  }
  
  // 获取值
  get(): T {
    // 收集当前订阅者
    if (currentTracking) {
      this.subscribers.add(currentTracking);
    }
    return this.value;
  }
  
  // 设置值
  set(newValue: T | ((prev: T) => T)) {
    const value = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(this.value) 
      : newValue;
    
    if (value !== this.value) {
      this.value = value;
      this.notify();
    }
  }
  
  // 更新值
  update(fn: (prev: T) => T) {
    this.set(fn(this.value));
  }
  
  // 通知所有订阅者
  private notify() {
    // 使用微任务批量更新
    batch(() => {
      this.subscribers.forEach(fn => fn());
      this.effects.forEach(fn => fn());
    });
  }
  
  // 订阅变化
  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }
  
  // 添加副作用
  addEffect(fn: Effect): () => void {
    this.effects.add(fn);
    return () => this.effects.delete(fn);
  }
  
  // 创建计算属性
  computed<T>(fn: () => T): Signal<T> {
    const signal = new Signal<T>(fn());
    this.subscribe(() => {
      signal.set(fn());
    });
    return signal;
  }
}

/**
 * 全局追踪器
 */
let currentTracking: Subscriber | null = null;

export function track<T>(fn: () => T): T {
  const prev = currentTracking;
  currentTracking = null;
  try {
    return fn();
  } finally {
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
const effectSubscriptions = new WeakMap<Effect, Set<Signal<any>>>();

// Global tracking: signal -> Set of effects subscribed to it
const signalSubscribers = new WeakMap<Signal<any>, Set<Effect>>();

export function createEffect(fn: Effect): () => void {
  const effect = () => {
    const prev = currentTracking;
    currentTracking = effect;
    try {
      fn();
    } finally {
      currentTracking = prev;
    }
  };

  // Track subscribed signals for cleanup (non-Window-compatible WeakMap requires object keys)
  const subscribedSignals = new Set<Signal<any>>();

  // Wrapper that tracks subscriptions
  const trackedEffect = () => {
    const prev = currentTracking;
    currentTracking = effect;
    subscribedSignals.clear();

    // Override Signal.get() temporarily to track subscriptions
    const originalGet = Signal.prototype.get;
    Signal.prototype.get = function<T>(this: Signal<T>): T {
      if (currentTracking) {
        // Track this signal as being subscribed
        subscribedSignals.add(this);

        // Also track in global map for cross-effect cleanup
        let effects = signalSubscribers.get(this);
        if (!effects) {
          effects = new Set();
          signalSubscribers.set(this, effects);
        }
        effects.add(currentTracking as Effect);

        // Track in effect's local set for cleanup
        let subscribed = effectSubscriptions.get(currentTracking as Effect);
        if (!subscribed) {
          subscribed = new Set();
          effectSubscriptions.set(currentTracking as Effect, subscribed);
        }
        subscribed.add(this);
      }
      return originalGet.call(this);
    };

    try {
      fn();
    } finally {
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
let batchQueue: Set<Effect> = new Set();
let isBatching = false;

export function batch(fn: () => void) {
  if (isBatching) {
    fn();
  } else {
    isBatching = true;
    try {
      fn();
    } finally {
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
export function memo<T>(fn: () => T): Signal<T> {
  const signal = new Signal<T>(undefined as T);
  
  createEffect(() => {
    signal.set(fn());
  });
  
  return signal;
}

/**
 * 创建响应式状态
 */
export function createSignal<T>(initialValue: T): [() => T, (value: T | ((prev: T) => T)) => void] {
  const signal = new Signal(initialValue);
  return [signal.get.bind(signal), signal.set.bind(signal)];
}

/**
 * 创建响应式数组
 */
export function createArraySignal<T>(initialValue: T[]): {
  signal: Signal<T[]>;
  push: (item: T) => void;
  pop: () => T | undefined;
  splice: (index: number, deleteCount: number, ...items: T[]) => T[];
  update: (index: number, item: T) => void;
  remove: (index: number) => T;
} {
  const signal = new Signal(initialValue);
  
  return {
    signal,
    push: (item: T) => {
      signal.update(arr => [...arr, item]);
    },
    pop: () => {
      let result: T | undefined;
      signal.update(arr => {
        result = arr[arr.length - 1];
        return arr.slice(0, -1);
      });
      return result;
    },
    splice: (index: number, deleteCount: number, ...items: T[]) => {
      let result: T[] = [];
      signal.update(arr => {
        result = arr.splice(index, deleteCount, ...items);
        return [...arr];
      });
      return result;
    },
    update: (index: number, item: T) => {
      signal.update(arr => {
        const newArr = [...arr];
        newArr[index] = item;
        return newArr;
      });
    },
    remove: (index: number) => {
      let result: T;
      signal.update(arr => {
        result = arr[index];
        return arr.filter((_, i) => i !== index);
      });
      return result!;
    }
  };
}

/**
 * createLazyComputed - Vue 3 style lazy computed
 * Only recomputes when first accessed and only updates on access after dependency changes
 */
export function createLazyComputed<T>(
  compute: () => T
): () => T {
  let value: T;
  let hasValue = false;
  let dirty = true;
  let currentTracking: Subscriber | null = null;

  const signal = new Signal<T>(undefined as T);

  // Subscribe to track dependencies
  const trackedCompute = () => {
    const prev = currentTracking;
    currentTracking = () => {
      dirty = true;
    };

    try {
      value = compute();
      hasValue = true;
      dirty = false;
    } finally {
      currentTracking = prev;
    }
  };

  // Run once to initialize
  trackedCompute();

  // Return getter that only recomputes when dirty
  return () => {
    if (dirty) {
      trackedCompute();
    }
    return value;
  };
}

/**
 * ComputedSignal - A computed signal that caches its value
 * Similar to Vue 3's computed
 */
export class ComputedSignal<T> {
  private value: T;
  private computeFn: () => T;
  private subscribers: Set<Subscriber> = new Set();
  private dirty = true;
  private trackingSignal: Signal<any> | null = null;

  constructor(fn: () => T) {
    this.computeFn = fn;
    this.value = fn();
  }

  get(): T {
    // Collect dependency tracking
    if (currentTracking) {
      this.subscribers.add(currentTracking);
    }

    if (this.dirty) {
      // Track signals accessed during computation
      const prevTracking = currentTracking;
      currentTracking = () => {
        this.markDirty();
      };

      try {
        this.value = this.computeFn();
        this.dirty = false;
      } finally {
        currentTracking = prevTracking;
      }
    }

    return this.value;
  }

  private markDirty(): void {
    this.dirty = true;
    this.notify();
  }

  private notify(): void {
    batch(() => {
      this.subscribers.forEach(fn => fn());
    });
  }
}

/**
 * 导出类型
 */
export type { Subscriber, Effect };
