import * as rpc from "./rpc";
import type { CollectionRpc } from "./collection";
export { Document } from "./document";
export { Collection } from "./collection";

export async function handleRequest(request: Request, env: Bindings) {
  const users = new rpc.Client<CollectionRpc>({
    namespace: env.COLLECTION,
    durableObjectName: "users",
    url: request.url,
  });

  const pathname = new URL(request.url).pathname;
  if (pathname === "/create") {
    const id = crypto.randomUUID();
    await users.call("create", { id, data: await request.json() });
    return new Response(JSON.stringify({ id }), { status: 200 });
  }
  if (pathname.startsWith("/read/")) {
    const id = pathname.replace("/read/", "");
    return new Response(JSON.stringify(await users.call("read", id)));
  }

  return new Response("Bad pathname", { status: 400 });
}

const worker: ExportedHandler<Bindings> = { fetch: handleRequest };

// Make sure we export the Counter Durable Object class
export default worker;
