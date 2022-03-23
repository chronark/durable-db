import { DurableRpcObject } from "./rpc/server";
import { Client } from "./rpc/client";
import { RpcContext } from "./rpc/types";

const methods = {
  hello: (_ctx: RpcContext, s: string) => `Hello ${s}`,
  getById: async (ctx: RpcContext, id: string): Promise<string | null> => {
    return (await ctx.state.storage.get(id)) ?? null;
  },
  set: async (ctx: RpcContext, id: string, value: unknown): Promise<void> => {
    return await ctx.state.storage.put(id, value);
  },
};
export class RPC extends DurableRpcObject<typeof methods> {
  constructor(state: DurableObjectState) {
    super({ state, methods });
  }
}

export async function handleRequest(request: Request, env: Bindings) {
  // Forward the request to the named Durable Object...
  const { RPC } = env;
  const id = RPC.newUniqueId();
  const durableObject = RPC.get(id);
  const client = new Client<typeof methods>({
    durableObject,
    url: request.url,
  });

  await client.call("set", "id", "hello world");
  const response = await client.call("getById", "id");

  //   console.log({ response });
  return new Response(response, { status: 200 });
}

const worker: ExportedHandler<Bindings> = { fetch: handleRequest };

// Make sure we export the Counter Durable Object class
export default worker;
