import crypto from "crypto";
import { faker } from "@faker-js/faker";
export type ID = string;
export type Data = string | number | boolean;

type Callback<TDocument> = (arg: TDocument) => void | Promise<void>;

type Document<TData> = {
  id: ID;
  data: TData;
};
enum Event {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
}
export type ValuesOf<T extends any[]> = T[number];

export interface CRUD<T> {
  create: (id: ID, data: T) => Promise<void>;
  read: (id: ID) => Promise<T | null>;
  update: (id: ID, data: Partial<T>) => Promise<T>;
  delete: (id: ID) => Promise<T>;
  list: () => Promise<T[]>;
}

class InMemoryStorage<TData> implements CRUD<TData> {
  private documents: Record<ID, TData> = {};

  create = async (id: ID, data: TData) => {
    this.documents[id] = data;
  };
  read = async (id: ID) => this.documents[id] ?? null;
  update = async (id: ID, data: Partial<TData>) => {
    if (!this.documents[id]) {
      throw new Error(`Document does not exist: ${id}`);
    }
    this.documents[id] = { ...this.documents[id]!, ...data };
    return this.documents[id]!;
  };
  delete = async (id: ID) => {
    const document = this.documents[id];
    if (!document) {
      throw new Error(`Document does not exist: ${id}`);
    }
    delete this.documents[id];
    return document;
  };
  list = async () => Object.values(this.documents);
}

export class Collection<TData extends Record<string, Data>> {
  public readonly id: string;
  public readonly name: string;
  public readonly storage: CRUD<Document<TData>>;
  private events: Partial<
    Record<Event, Record<string, Callback<Document<TData>[]>>>
  > = {};

  constructor(name: string, crud: CRUD<Document<TData>>) {
    this.id = crypto.randomUUID();
    this.name = name;
    this.storage = crud;
  }

  /**
   * Returns unsubscribe function
   */
  public subscribe = (
    event: Event,
    callback: Callback<Document<TData>[]>
  ): (() => void) => {
    const id = crypto.randomUUID();
    if (!(event in this.events)) {
      this.events[event] = {};
    }

    this.events[event]![id] = callback;

    return () => {
      for (const callbacks of Object.values(this.events)) {
        if (id in callbacks) {
          delete callbacks[id];
        }
      }
    };
  };
  private publish = (event: Event, documents: Document<TData>[]): void => {
    for (const callback of Object.values(this.events[event] ?? {})) {
      callback(documents);
    }
  };

  public createDocument = async (data: TData): Promise<{ id: string }> => {
    const id = crypto.randomUUID();
    const document = { id, data };
    await this.storage.create(id, document);
    this.publish(Event.CREATE, [document]);

    return { id };
  };

  public readDocument = async (id: ID): Promise<Document<TData> | null> => {
    const document = await this.storage.read(id);
    if (document) {
      this.publish(Event.READ, [document]);
    }
    return document;
  };
  public updateDocument = async (
    id: ID,
    data: Partial<TData>
  ): Promise<Document<TData>> => {
    const document = await this.storage.update(id, data);
    this.publish(Event.UPDATE, [document]);

    return document;
  };

  public deleteDocument = async (id: ID): Promise<void> => {
    const document = await this.storage.delete(id);
    this.publish(Event.DELETE, [document]);
  };
}

export class Index<
  TData extends Record<string, Data>,
  TTerms extends (keyof TData)[]
> {
  public readonly id: string;
  public readonly name: string;
  private readonly collection: Collection<TData>;
  private map: Record<string, ID[]> = {};
  private termFields: TTerms;

  constructor({
    name,
    collection,
    termFields,
  }: {
    name: string;
    collection: Collection<TData>;
    termFields: TTerms;
  }) {
    this.id = crypto.randomUUID();
    this.name = name;
    this.collection = collection;
    this.termFields = termFields;

    this.collection.subscribe(Event.CREATE, this.index);
    this.collection.subscribe(Event.UPDATE, (documents) => {
      this.removeFromIndex(Object.keys(documents));
      this.index(documents);
    });
    this.collection.subscribe(Event.DELETE, (documents) => {
      this.removeFromIndex(Object.keys(documents));
    });
  }

  private removeFromIndex = (ids: ID[]): void => {
    for (const indexed of Object.entries(this.map)) {
      for (const id of indexed[1]) {
        if (ids.includes(id)) {
          this.map[indexed[0]]!.splice(this.map[indexed[0]]!.indexOf(id), 1);
        }
      }
    }
  };

  private hashTerms = (
    terms: Partial<Record<ValuesOf<TTerms>, Data>>
  ): string => {
    return Object.entries(terms)
      .map((term) => term.join(":"))
      .join("__");
  };
  private index = (documents: Document<TData>[]) => {
    for (const document of documents) {
      const terms = this.termFields.reduce((acc, field) => {
        acc[field] = document.data[field];
        return acc;
      }, {} as Record<keyof TData, Data>);

      const key = this.hashTerms(terms);

      this.map[key] = [...new Set([...(this.map[key] ?? []), document.id])];
    }
  };

  public reindex = async (): Promise<void> => {
    this.map = {};
    this.index(await this.collection.storage.list());
  };

  public match = async (
    matches: Partial<Record<ValuesOf<TTerms>, Data>>
  ): Promise<Document<TData>[]> => {
    console.time("hash");
    const key = this.hashTerms(matches);
    console.log({ key });
    console.timeEnd("hash");
    console.time("ids");
    const ids = this.map[key] ?? [];
    console.timeEnd("ids");
    console.time("documents");
    console.log({ ids });
    const documents = await Promise.all(
      ids.map(async (id) => await this.collection.readDocument(id))
    );
    console.timeEnd("documents");
    console.time("filter");
    const filtered = documents.filter(
      (d) => !!d
    ) as unknown as Document<TData>[];
    console.timeEnd("filter");
    return filtered;
  };
}

type User = {
  name: string;
  email: string;
};

async function main() {
  const c = new Collection<User>("users", new InMemoryStorage());
  const i = new Index({
    name: "usersByEmail",
    collection: c,
    termFields: ["email"],
  });

  const n = 500_000;
  const start = Date.now();
  c.createDocument({
    name: "andreas",
    email: "andreas@upstash.com",
  });
  for (let i = 0; i < n; i++) {
    c.createDocument({
      name: faker.name.findName(),
      email: faker.internet.email(),
    });

    if (i % (n / 1000) === 0) {
      console.log(`${((i / n) * 100).toFixed(1)} %`);
      console.log(
        `Current memory: ${process.memoryUsage().heapTotal / 1000000} MB`
      );
    }
  }
  const took = Date.now() - start;
  console.log(
    `Seeding took ${(took / 1000).toFixed(1)} seconds, avg: ${took / n} ms`
  );

  console.time("index");
  await i.reindex();
  console.timeEnd("index");
  console.time("match");
  console.log(await i.match({ email: "andreas@upstash.com" }));
  console.timeEnd("match");
}
main();
