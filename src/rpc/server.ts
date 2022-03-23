import {
  FunctionArguments,
  FunctionResponse,
  RpcMethod,
  RpcService,
} from "./types";
import { RequestMessage, ResponseMessage } from "./message";

export type DurableRpcObjectConfig<TService extends RpcService> = {
  state: DurableObjectState;
  methods: TService;
  overwriteRpcPath?: string;
};

// deno-lint-ignore no-explicit-any
export class DurableRpcObject<TService extends RpcService>
  implements DurableObject
{
  private state: DurableObjectState;
  private methods: TService;

  private rpcPathname: string;

  constructor(config: DurableRpcObjectConfig<TService>) {
    this.state = config.state;
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
        { state: this.state },
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
