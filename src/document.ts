import * as rpc from "./rpc";
import type { ID } from "./types";
import { deepMerge } from "./util";

export type Data = Record<string, unknown>;

const documentRpc = {
  create: async (ctx: rpc.Context, data: Data) => {
    await ctx.state.storage.put("data", data);
    return data;
  },
  read: async (ctx: rpc.Context): Promise<Data | null> => {
    return (await ctx.state.storage.get<Data>("data")) ?? null;
  },

  update: async (ctx: rpc.Context, data: Data) => {
    const existing = await ctx.state.storage.get<Data>("data");
    if (!existing) {
      throw new Error(`Document does not exist`);
    }
    const updated = deepMerge(existing, data);
    await ctx.state.storage.put("data", updated);
    return updated;
  },
  delete: async (ctx: rpc.Context) => {
    await ctx.state.storage.deleteAll();
  },
};

export type DocumentRpc = typeof documentRpc;

export class Document extends rpc.ServerObject<DocumentRpc> {
  constructor(state: DurableObjectState, env: Bindings) {
    super({ state, env, methods: documentRpc });
  }
}
