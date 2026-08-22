import { Hono } from "hono";
import type { Pool } from "pg";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";
import { createDatabasePool } from "../database-runtime";
import { createStorageAdapter, type StorageObject, type StorageRuntimeEnv } from "../generated/storage-adapter";

type StorageBindings = AuthRuntimeEnv & StorageRuntimeEnv;
type ObjectRow = {
  id: string;
  owner_user_id: string;
  provider: string;
  bucket: string;
  object_key: string;
  file_name: string;
  content_type: string;
  byte_size: string;
  visibility: "private" | "public";
  etag: string | null;
  created_at: string;
};

const feature = new Hono<{ Bindings: AuthRuntimeEnv }>();
const safeContentType = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/iu;

function unauthorized(c: { json: (value: unknown, status: 401 | 403 | 404 | 413 | 422 | 500) => Response }, status: 401 | 403 | 404 = 401) {
  const messages = { 401: "Authentication required.", 403: "Permission denied.", 404: "Object not found." } as const;
  return c.json({ error: { code: status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : "NOT_FOUND", message: messages[status] } }, status);
}

function fileName(value: string | undefined) {
  const normalized = String(value || "upload.bin").normalize("NFKC").trim();
  if (!normalized || normalized.length > 180 || /[\u0000-\u001f/\\]/u.test(normalized)) return null;
  return normalized;
}

function responseFor(object: StorageObject, name: string) {
  return new Response(object.body, {
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      ...(object.etag ? { ETag: object.etag } : {}),
    },
  });
}

async function rowFor(database: Pool, id: string) {
  const result = await database.query<ObjectRow>(
    `select id, owner_user_id, provider, bucket, object_key, file_name, content_type,
            byte_size::text, visibility, etag, created_at::text
       from app_object_storage
      where id = $1 and deleted_at is null`,
    [id],
  );
  return result.rows[0] || null;
}

feature.get("/api/storage/objects", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return unauthorized(c);
    const result = await database.query<ObjectRow>(
      `select id, owner_user_id, provider, bucket, object_key, file_name, content_type,
              byte_size::text, visibility, etag, created_at::text
         from app_object_storage
        where owner_user_id = $1 and deleted_at is null
        order by created_at desc, id desc
        limit 100`,
      [session.user.id],
    );
    return c.json({ data: { objects: result.rows.map((row) => ({ id: row.id, fileName: row.file_name, contentType: row.content_type, byteSize: Number(row.byte_size), visibility: row.visibility, provider: row.provider, createdAt: row.created_at })) } });
  }),
);

feature.post("/api/storage/objects", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return unauthorized(c);
    const maximum = Number(c.env.STORAGE_MAX_UPLOAD_BYTES || 10_485_760);
    const declared = Number(c.req.header("content-length") || 0);
    if (declared > maximum) return c.json({ error: { code: "UPLOAD_TOO_LARGE", message: `Upload exceeds ${maximum} bytes.` } }, 413);
    const name = fileName(c.req.header("x-file-name"));
    const contentType = (String(c.req.header("content-type") || "application/octet-stream").split(";", 1)[0] || "application/octet-stream").trim().toLowerCase();
    const visibility = c.req.header("x-object-visibility") === "public" ? "public" : "private";
    if (!name || !safeContentType.test(contentType) || new Set(["text/html", "image/svg+xml"]).has(contentType))
      return c.json({ error: { code: "INVALID_UPLOAD", message: "File name or content type is not allowed." } }, 422);
    const bytes = new Uint8Array(await c.req.arrayBuffer());
    if (!bytes.byteLength || bytes.byteLength > maximum)
      return c.json({ error: { code: "UPLOAD_TOO_LARGE", message: `Upload must contain 1-${maximum} bytes.` } }, 413);
    const id = crypto.randomUUID();
    const key = `users/${session.user.id}/${id}`;
    const storage = createStorageAdapter(c.env as StorageBindings);
    const stored = await storage.put(key, bytes, contentType);
    try {
      await database.query(
        `insert into app_object_storage
          (id, owner_user_id, provider, bucket, object_key, file_name, content_type, byte_size, visibility, etag)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, session.user.id, storage.provider, storage.bucket, key, name, contentType, bytes.byteLength, visibility, stored.etag],
      );
    } catch (error) {
      await storage.delete(key).catch(() => undefined);
      throw error;
    }
    return c.json({ data: { id, fileName: name, contentType, byteSize: bytes.byteLength, visibility, provider: storage.provider } }, 201);
  }),
);

feature.get("/api/storage/objects/:id", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return unauthorized(c);
    const row = await rowFor(database, c.req.param("id"));
    if (!row) return unauthorized(c, 404);
    if (row.owner_user_id !== session.user.id) return unauthorized(c, 403);
    const object = await createStorageAdapter(c.env as StorageBindings).get(row.object_key);
    return object ? responseFor(object, row.file_name) : unauthorized(c, 404);
  }),
);

feature.get("/api/public/storage/:id", async (c) => {
  const database = createDatabasePool(c.env, `${c.env.SERVICE_NAME}-public-storage`);
  try {
    const row = await rowFor(database, c.req.param("id"));
    if (!row || row.visibility !== "public") return unauthorized(c, 404);
    const object = await createStorageAdapter(c.env as StorageBindings).get(row.object_key);
    return object ? responseFor(object, row.file_name) : unauthorized(c, 404);
  } finally {
    await database.end();
  }
});

feature.delete("/api/storage/objects/:id", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return unauthorized(c);
    const row = await rowFor(database, c.req.param("id"));
    if (!row) return unauthorized(c, 404);
    if (row.owner_user_id !== session.user.id) return unauthorized(c, 403);
    await database.query("update app_object_storage set deleted_at = current_timestamp where id = $1 and deleted_at is null", [row.id]);
    await createStorageAdapter(c.env as StorageBindings).delete(row.object_key);
    return c.body(null, 204);
  }),
);

export const objectStorageFeature = feature;
