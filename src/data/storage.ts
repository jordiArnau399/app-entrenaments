import type { Snapshot } from '../domain/types';
import type { SyncOp } from '../domain/sync';

export interface Storage {
  loadSnapshot(): Promise<Snapshot | null>;
  saveSnapshot(snapshot: Snapshot): Promise<void>;
  loadQueue(): Promise<SyncOp[]>;
  saveQueue(queue: SyncOp[]): Promise<void>;
}

export class MemoryStorage implements Storage {
  snapshot: Snapshot | null = null;
  queue: SyncOp[] = [];

  async loadSnapshot(): Promise<Snapshot | null> {
    return this.snapshot ? structuredClone(this.snapshot) : null;
  }

  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    this.snapshot = structuredClone(snapshot);
  }

  async loadQueue(): Promise<SyncOp[]> {
    return structuredClone(this.queue);
  }

  async saveQueue(queue: SyncOp[]): Promise<void> {
    this.queue = structuredClone(queue);
  }
}
