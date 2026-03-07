/**
 * Typed long-term memory contracts shared between gateway and worker.
 */

export type MemoryRecordType =
  | "identity"
  | "preference"
  | "decision"
  | "fact"
  | "event"
  | "observation"
  | "todo";

export type MemoryRelationType =
  | "related_to"
  | "updates"
  | "contradicts"
  | "caused_by"
  | "result_of"
  | "part_of";

export type MemorySortField = "createdAt" | "updatedAt" | "importance";
export type MemorySortDirection = "asc" | "desc";

export interface MemoryFilter {
  types?: MemoryRecordType[];
  tags?: string[];
  from?: string; // ISO timestamp
  to?: string; // ISO timestamp
}

export interface MemorySort {
  field: MemorySortField;
  direction: MemorySortDirection;
}

export interface SaveMemoryRequest {
  type: MemoryRecordType;
  content: string;
  tags?: string[];
  importance?: number;
  source?: string;
  idempotencyKey?: string;
}

export interface SaveMemoryResponse {
  memoryId: string;
  createdAt: string;
}

export interface RecallMemoryRequest {
  query?: string;
  filter?: MemoryFilter;
  limit?: number;
  sort?: MemorySort;
}

export interface MemoryRecord {
  id: string;
  type: MemoryRecordType;
  content: string;
  tags?: string[];
  importance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecallMemoryResponse {
  items: MemoryRecord[];
}

export interface UpdateMemoryRequest {
  memoryId: string;
  content?: string;
  tags?: string[];
  importance?: number;
  type?: MemoryRecordType;
  idempotencyKey?: string;
}

export interface UpdateMemoryResponse {
  memoryId: string;
  updatedAt: string;
}

export interface LinkMemoryRequest {
  fromMemoryId: string;
  toMemoryId: string;
  relation: MemoryRelationType;
  idempotencyKey?: string;
}

export interface LinkMemoryResponse {
  linkId: string;
  createdAt: string;
}

export interface MemoryError {
  code: string;
  message: string;
  retryable?: boolean;
}
