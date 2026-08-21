import type { AuthRuntimeEnv } from "./auth-runtime";

export type WorkerEventFeature = {
  queue?: (
    batch: MessageBatch<unknown>,
    env: AuthRuntimeEnv,
    ctx: ExecutionContext,
  ) => Promise<void>;
};
