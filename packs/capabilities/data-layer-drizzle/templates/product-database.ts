import { drizzle } from "drizzle-orm/node-postgres";
import * as productSchema from "../../db/schema/product";
import {
  createDatabasePool,
  type RuntimeDatabaseEnv,
} from "./database-runtime";

export function createProductDatabase(env: RuntimeDatabaseEnv) {
  const pool = createDatabasePool(env, "starter-product-drizzle");
  return {
    database: drizzle(pool, { schema: productSchema }),
    close: () => pool.end(),
  };
}
