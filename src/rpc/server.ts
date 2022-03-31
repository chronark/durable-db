import { FunctionArguments, Service } from "./types";
import { RequestMessage, ResponseMessage } from "./message";

export type ServerObjectConfig<TService extends Service> = {
  state: DurableObjectState;
  env: Bindings;
  methods: TService;
  overwriteRpcPath?: string;
};

// deno-lint-ignore no-explicit-any
export class ServerObject<TService extends Service> implements DurableObject {
  protected state: DurableObjectState;
  protected env: Bindings;
  protected methods: TService;

  protected rpcPathname: string;

  constructor(config: ServerObjectConfig<TService>) {
    this.state = config.state;
    this.env = config.env;
    this.methods = config.methods;
    this.rpcPathname = config.overwriteRpcPath ?? "/rpc";
  }

  public async fetch(req: Request): Promise<Response> {
    if (new URL(req.url).pathname !== this.rpcPathname) {
      return new Response(`Not found: ${req.url}`, { status: 404 });
    }

    const { method, args } = RequestMessage.deserialize<{
      method: keyof TService;
      request: FunctionArguments<TService[keyof TService]>;
    }>(await req.text()).content;
    try {
      const response = await this.methods[method](
        { state: this.state, env: this.env, url: req.url },
        ...args
      );

      return new Response(
        new ResponseMessage<TService>({ response }).serialize(),
        { status: 200 }
      );
    } catch (err) {
      return new Response((err as Error).message, { status: 500 });
    }
  }
}
