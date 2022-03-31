import { DocumentRpc } from "./document";
import * as rpc from "./rpc";
import type { ID } from "./types";
import { deepMerge } from "./util";
import type { Data } from "./document";
type Document<TData = Data> = {
  id: ID;
  data: TData;
};

export type CollectionRpc<TData = Data> = {
  create: (
    ctx: rpc.Context,
    document: Document<TData>
  ) => Promise<Document<TData>>;

  read: (ctx: rpc.Context, documentId: ID) => Promise<Document<TData> | null>;

  update: (
    ctx: rpc.Context,
    documentId: ID,
    data: TData
  ) => Promise<Document<TData>>;
  delete: (ctx: rpc.Context, documentId: ID) => Promise<void>;
};

const collectionRpc: CollectionRpc = {
  create: async (ctx: rpc.Context, document: Document) => {
    const client = new rpc.Client<DocumentRpc>({
      namespace: ctx.env.DOCUMENT,
      durableObjectName: document.id,
      url: ctx.url,
    });

    await client.call("create", document.data);

    return document;
  },
  read: async (ctx: rpc.Context, id: ID) => {
    const client = new rpc.Client<DocumentRpc>({
      namespace: ctx.env.DOCUMENT,
      durableObjectName: id,
      url: ctx.url,
    });

    const data = await client.call("read");
    if (!data) {
      return null;
    }
    return { id, data };
  },

  update: async (ctx, id, data) => {
    const client = new rpc.Client<DocumentRpc>({
      namespace: ctx.env.DOCUMENT,
      durableObjectName: id,
      url: ctx.url,
    });
    const existing = await client.call("read");

    if (!existing) {
      throw new Error(`Document does not exist: ${id}`);
    }
    const updated = deepMerge(existing.data, data);

    await client.call("update", updated);

    return { id, data: updated };
  },
  delete: async (ctx, id) => {
    const client = new rpc.Client<DocumentRpc>({
      namespace: ctx.env.DOCUMENT,
      durableObjectName: id,
      url: ctx.url,
    });
    await client.call("delete");
  },
};

export class Collection extends rpc.ServerObject<typeof collectionRpc> {
  constructor(state: DurableObjectState, env: Bindings) {
    super({ state, methods: collectionRpc, env });
  }
}
