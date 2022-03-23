import {
  WithoutRpcContext,
  FunctionArguments,
  FunctionResponse,
  RpcService,
} from "./types";
import { RequestMessage, ResponseMessage } from "./message";

export type ClientConfig = {
  durableObject: DurableObjectStub;
  url: string;
  overwriteRpcPath?: string;
};
export class Client<
  // deno-lint-ignore no-explicit-any
  TService extends RpcService
> {
  private durableObject: DurableObjectStub;
  private url: string;
  constructor(config: ClientConfig) {
    console.log(config);
    this.durableObject = config.durableObject;
    const url = new URL(config.url);
    url.pathname = config.overwriteRpcPath ?? "/rpc";
    this.url = url.href;
    console.log(this.url);
  }

  public async call<TMethod extends keyof TService>(
    method: TMethod,
    ...args: WithoutRpcContext<FunctionArguments<TService[TMethod]>>
  ): Promise<FunctionResponse<TService[TMethod]>> {
    const msg = new RequestMessage<TService>({
      method,
      args,
    });

    const res = await this.durableObject.fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: msg.serialize(),
    });
    if (!res.ok) {
      throw new Error(`RPC unsuccessful: ${await res.text()}`);
    }
    const body = await res.text();
    return ResponseMessage.deserialize<TService>(body).content.response;
  }
}
