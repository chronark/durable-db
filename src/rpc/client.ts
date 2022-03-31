import {
  WithoutContext,
  FunctionArguments,
  FunctionResponse,
  Service,
} from "./types";
import { RequestMessage, ResponseMessage } from "./message";

export type ClientConfig = {
  namespace: DurableObjectNamespace;
  durableObjectName: string;
  url: string;
  overwriteRpcPath?: string;
};
export class Client<TService extends Service> {
  private durableObject: DurableObjectStub;
  private url: string;
  constructor(config: ClientConfig) {
    const url = new URL(config.url);
    url.pathname = config.overwriteRpcPath ?? "/rpc";
    this.url = url.href;

    this.durableObject = config.namespace.get(
      config.namespace.idFromName(config.durableObjectName)
    );
  }

  public async call<TMethod extends keyof TService>(
    method: TMethod,
    ...args: WithoutContext<FunctionArguments<TService[TMethod]>>
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
