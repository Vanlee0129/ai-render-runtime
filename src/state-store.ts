import { Spec } from './spec-contract';

interface Snapshot {
  id: string;
  spec: Spec;
  timestamp: string;
  label?: string;
}

type StateChangeCallback = (spec: Spec) => void;

/**
 * StateStore - 使用 Memento Pattern 管理 Spec 状态历史
 *
 * 支持:
 * - 快照保存和恢复
 * - 状态历史遍历
 * - 变更订阅
 */
export class StateStore {
  private currentSpec: Spec | null = null;
  private snapshots: Map<string, Snapshot> = new Map();
  private history: string[] = [];  // snapshot IDs in order
  private subscribers: Set<StateChangeCallback> = new Set();
  private maxHistory: number;

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  getState(): Spec | null {
    return this.currentSpec;
  }

  setState(spec: Spec, label?: string): string {
    const snapshotId = this.saveSnapshot(label);
    this.currentSpec = spec;
    this.notify();
    this.pruneHistory();
    return snapshotId;
  }

  saveSnapshot(label?: string): string {
    if (!this.currentSpec) {
      throw new Error('Cannot save snapshot: no current spec');
    }
    const id = this.generateId();
    const snapshot: Snapshot = {
      id,
      spec: JSON.parse(JSON.stringify(this.currentSpec)),
      timestamp: new Date().toISOString(),
      label,
    };
    this.snapshots.set(id, snapshot);
    this.history.push(id);
    return id;
  }

  restore(snapshotId: string): boolean {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return false;
    this.saveSnapshot('before_restore');
    this.currentSpec = JSON.parse(JSON.stringify(snapshot.spec));
    this.notify();
    return true;
  }

  getSnapshot(snapshotId: string): Snapshot | null {
    return this.snapshots.get(snapshotId) || null;
  }

  getHistory(): Snapshot[] {
    return this.history
      .map(id => this.snapshots.get(id))
      .filter((s): s is Snapshot => s !== undefined);
  }

  undo(): boolean {
    if (this.history.length < 2) return false;
    const currentId = this.history.pop();
    this.snapshots.delete(currentId!);
    const previousId = this.history[this.history.length - 1];
    const previous = this.snapshots.get(previousId!);
    if (previous) {
      this.currentSpec = JSON.parse(JSON.stringify(previous.spec));
      this.notify();
      return true;
    }
    return false;
  }

  subscribe(callback: StateChangeCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  clear(): void {
    this.snapshots.clear();
    this.history = [];
  }

  private notify(): void {
    if (this.currentSpec) {
      this.subscribers.forEach(cb => cb(this.currentSpec!));
    }
  }

  private pruneHistory(): void {
    while (this.history.length > this.maxHistory) {
      const oldestId = this.history.shift();
      if (oldestId) this.snapshots.delete(oldestId);
    }
  }

  private generateId(): string {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const globalStateStore = new StateStore();
