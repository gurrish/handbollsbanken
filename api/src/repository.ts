import { TableClient, type TableEntity } from "@azure/data-tables";
import { BlobServiceClient } from "@azure/storage-blob";

export interface Repository {
  list<T>(table: string, partitionKey?: string): Promise<T[]>;
  get<T>(table: string, partitionKey: string, id: string): Promise<T | undefined>;
  upsert<T extends { id: string }>(table: string, partitionKey: string, item: T): Promise<void>;
  delete(table: string, partitionKey: string, id: string): Promise<void>;
  readDiagram(clubId: string, exerciseId: string): Promise<string>;
  saveDiagram(clubId: string, exerciseId: string, diagramJson: string): Promise<void>;
  deleteDiagram(clubId: string, exerciseId: string): Promise<void>;
}

type StoredEntity = TableEntity<Record<string, unknown>>;
function toEntity<T extends { id: string }>(partitionKey: string, item: T, table: string): StoredEntity {
  const entity: StoredEntity = { partitionKey, rowKey: item.id };
  for (const [key, value] of Object.entries(item)) {
    if (key === "id") continue;
    if (key === "diagramJson" && table === "Exercises") {
      entity[key] = "[]";
    } else if (Array.isArray(value) || typeof value === "object") {
      entity[`${key}Json`] = JSON.stringify(value);
    } else {
      entity[key] = value as string | number | boolean;
    }
  }
  return entity;
}
function fromEntity<T>(entity: StoredEntity): T {
  const { partitionKey: _partitionKey, rowKey, etag: _etag, timestamp: _timestamp, ...fields } = entity;
  const value: Record<string, unknown> = { ...fields, id: rowKey };
  for (const [key, field] of Object.entries(fields)) {
    if (key !== "diagramJson" && key.endsWith("Json") && typeof field === "string") {
      value[key.slice(0, -4)] = JSON.parse(field);
      delete value[key];
    }
  }
  return value as T;
}

export class MemoryRepository implements Repository {
  private readonly tables = new Map<string, Map<string, unknown>>();
  private readonly diagrams = new Map<string, string>();
  private rows(table: string) {
    let rows = this.tables.get(table);
    if (!rows) {
      rows = new Map();
      this.tables.set(table, rows);
    }
    return rows;
  }
  async list<T>(table: string, partitionKey?: string): Promise<T[]> {
    return [...this.rows(table).entries()]
      .filter(([key]) => !partitionKey || key.startsWith(`${partitionKey}:`))
      .map(([, value]) => structuredClone(value) as T);
  }
  async get<T>(table: string, partitionKey: string, id: string): Promise<T | undefined> {
    const value = this.rows(table).get(`${partitionKey}:${id}`);
    return value === undefined ? undefined : structuredClone(value) as T;
  }
  async upsert<T extends { id: string }>(table: string, partitionKey: string, item: T): Promise<void> {
    this.rows(table).set(`${partitionKey}:${item.id}`, structuredClone(item));
  }
  async delete(table: string, partitionKey: string, id: string): Promise<void> {
    this.rows(table).delete(`${partitionKey}:${id}`);
  }
  async readDiagram(clubId: string, exerciseId: string): Promise<string> {
    return this.diagrams.get(`${clubId}:${exerciseId}`) || "[]";
  }
  async saveDiagram(clubId: string, exerciseId: string, diagramJson: string): Promise<void> {
    this.diagrams.set(`${clubId}:${exerciseId}`, diagramJson);
  }
  async deleteDiagram(clubId: string, exerciseId: string): Promise<void> {
    this.diagrams.delete(`${clubId}:${exerciseId}`);
  }
}

export class TableRepository implements Repository {
  private readonly clients = new Map<string, TableClient>();
  private readonly blobs: BlobServiceClient;
  constructor(connectionString: string) {
    this.blobs = BlobServiceClient.fromConnectionString(connectionString);
    for (const tableName of ["Clubs", "Teams", "Users", "JoinRequests", "Exercises", "TrainingPlans", "TrainingTemplates"]) {
      this.clients.set(tableName, TableClient.fromConnectionString(connectionString, tableName));
    }
  }
  private client(table: string): TableClient {
    const client = this.clients.get(table);
    if (!client) throw new Error(`Unsupported storage table: ${table}`);
    return client;
  }
  async list<T>(table: string, partitionKey?: string): Promise<T[]> {
    const client = this.client(table);
    await client.createTable().catch((error: unknown) => {
      if (!(error instanceof Error) || !("statusCode" in error) || error.statusCode !== 409) throw error;
    });
    const filter = partitionKey ? `PartitionKey eq '${partitionKey.replaceAll("'", "''")}'` : undefined;
    const output: T[] = [];
    for await (const entity of client.listEntities<StoredEntity>({ queryOptions: { filter } })) {
      output.push(fromEntity<T>(entity));
    }
    return output;
  }
  async get<T>(table: string, partitionKey: string, id: string): Promise<T | undefined> {
    try {
      const entity = await this.client(table).getEntity<StoredEntity>(partitionKey, id);
      return fromEntity<T>(entity);
    } catch (error) {
      if (error instanceof Error && "statusCode" in error && error.statusCode === 404) return undefined;
      throw error;
    }
  }
  async upsert<T extends { id: string }>(table: string, partitionKey: string, item: T): Promise<void> {
    const client = this.client(table);
    await client.createTable().catch((error: unknown) => {
      if (!(error instanceof Error) || !("statusCode" in error) || error.statusCode !== 409) throw error;
    });
    await client.upsertEntity(toEntity(partitionKey, item, table), "Replace");
  }
  async delete(table: string, partitionKey: string, id: string): Promise<void> {
    try {
      await this.client(table).deleteEntity(partitionKey, id);
    } catch (error) {
      if (!(error instanceof Error) || !("statusCode" in error) || error.statusCode !== 404) throw error;
    }
  }
  async readDiagram(clubId: string, exerciseId: string): Promise<string> {
    const blob = this.blobs.getContainerClient("diagrams").getBlockBlobClient(`${clubId}/${exerciseId}.json`);
    try {
      return (await blob.downloadToBuffer()).toString("utf8");
    } catch (error) {
      if (error instanceof Error && "statusCode" in error && error.statusCode === 404) return "[]";
      throw error;
    }
  }
  async saveDiagram(clubId: string, exerciseId: string, diagramJson: string): Promise<void> {
    const container = this.blobs.getContainerClient("diagrams");
    await container.createIfNotExists();
    const blob = container.getBlockBlobClient(`${clubId}/${exerciseId}.json`);
    await blob.uploadData(Buffer.from(diagramJson, "utf8"), { blobHTTPHeaders: { blobContentType: "application/json" } });
  }
  async deleteDiagram(clubId: string, exerciseId: string): Promise<void> {
    const blob = this.blobs.getContainerClient("diagrams").getBlockBlobClient(`${clubId}/${exerciseId}.json`);
    await blob.deleteIfExists();
  }
}

let repository: Repository | undefined;
export function getRepository(): Repository {
  if (repository) return repository;
  const mode = process.env.STORAGE_MODE ?? (process.env.NODE_ENV === "development" ? "memory" : "table");
  if (mode === "memory") repository = new MemoryRepository();
  else if (mode === "table" && process.env.STORAGE_CONNECTION_STRING) repository = new TableRepository(process.env.STORAGE_CONNECTION_STRING);
  else throw new Error("Configure STORAGE_CONNECTION_STRING with STORAGE_MODE=table, or use STORAGE_MODE=memory locally.");
  return repository;
}
