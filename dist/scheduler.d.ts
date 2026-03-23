export declare const ImmediatePriority = 1;
export declare const UserBlockingPriority = 2;
export declare const NormalPriority = 3;
export declare const LowPriority = 4;
export declare const IdlePriority = 5;
export type Priority = typeof ImmediatePriority | typeof UserBlockingPriority | typeof NormalPriority | typeof LowPriority | typeof IdlePriority;
type Callback = () => void;
export declare function scheduleCallback(priority: Priority, callback: Callback): () => void;
export declare function runWithPriority<T>(priority: Priority, fn: () => T): T;
export declare function getCurrentPriority(): Priority;
export {};
//# sourceMappingURL=scheduler.d.ts.map