export type RpcContext = {
  state: DurableObjectState;
};

export type RpcService = Record<string, RpcMethod<any, any>>;

export type RpcMethod<TRequest extends unknown[], TResponse> = (
  ctx: RpcContext,
  ...req: TRequest
) => TResponse;

/**
 * An array of the types of all arguments from a function
 */
export type FunctionArguments<F> = F extends (...args: infer A) => unknown
  ? A
  : never;

export type FunctionResponse<F> = F extends (...args: any[]) => infer R
  ? R
  : never;

export type WithoutRpcContext<T extends unknown[]> = T extends []
  ? []
  : T extends [infer H, ...infer R]
  ? H extends RpcContext
    ? WithoutRpcContext<R>
    : [H, ...WithoutRpcContext<R>]
  : T;
