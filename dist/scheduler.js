// Priority levels (matching React)
export const ImmediatePriority = 1;
export const UserBlockingPriority = 2;
export const NormalPriority = 3;
export const LowPriority = 4;
export const IdlePriority = 5;
let taskQueue = [];
let isFlushScheduled = false;
function flush() {
    // Sort by priority (lower number = higher priority)
    taskQueue.sort((a, b) => a.priority - b.priority);
    while (taskQueue.length > 0) {
        const task = taskQueue.shift();
        if (task)
            task.callback();
    }
    isFlushScheduled = false;
}
export function scheduleCallback(priority, callback) {
    taskQueue.push({ callback, priority });
    if (!isFlushScheduled) {
        isFlushScheduled = true;
        // Use setTimeout to avoid blocking (except for ImmediatePriority)
        if (priority === ImmediatePriority) {
            flush();
        }
        else {
            Promise.resolve().then(flush);
        }
    }
    return () => {
        taskQueue = taskQueue.filter(t => t.callback !== callback);
    };
}
export function runWithPriority(priority, fn) {
    const prevPriority = currentPriority;
    currentPriority = priority;
    try {
        return fn();
    }
    finally {
        currentPriority = prevPriority;
    }
}
let currentPriority = NormalPriority;
export function getCurrentPriority() {
    return currentPriority;
}
//# sourceMappingURL=scheduler.js.map