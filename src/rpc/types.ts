export type Context = {
  state: DurableObjectState;
  env: Bindings;
  url: string;
};

export type Service = Record<string | symbol, RpcMethod<any, any>>;

export type RpcMethod<TRequest extends unknown[], TResponse> = (
  ctx: Context,
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

export type WithoutContext<T extends unknown[]> = T extends []
  ? []
  : T extends [infer H, ...infer R]
  ? H extends Context
    ? WithoutContext<R>
    : [H, ...WithoutContext<R>]
  : T;
