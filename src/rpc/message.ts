import {
  FunctionArguments,
  FunctionResponse,
  WithoutRpcContext,
} from "./types";
import superjson from "superjson";

export class RequestMessage<TService> {
  constructor(
    public readonly content: {
      method: keyof TService;
      args: WithoutRpcContext<FunctionArguments<TService[keyof TService]>>;
    }
  ) {
    this.content = content;
  }

  public serialize(): string {
    return superjson.stringify(this.content);
  }

  static deserialize<TService>(s: string): RequestMessage<TService> {
    const content = superjson.parse(s) as {
      method: keyof TService;
      args: WithoutRpcContext<FunctionArguments<TService[keyof TService]>>;
    };

    return new RequestMessage<TService>(content);
  }
}

export class ResponseMessage<TService> {
  public readonly content: {
    response: Awaited<FunctionResponse<TService[keyof TService]>>;
  };
  constructor(content: {
    response: Awaited<FunctionResponse<TService[keyof TService]>>;
  }) {
    this.content = content;
  }

  public serialize(): string {
    return superjson.stringify(this.content);
  }

  static deserialize<TService>(s: string): ResponseMessage<TService> {
    const content = superjson.parse(s) as {
      response: Awaited<FunctionResponse<TService[keyof TService]>>;
    };

    return new ResponseMessage<TService>(content);
  }
}
