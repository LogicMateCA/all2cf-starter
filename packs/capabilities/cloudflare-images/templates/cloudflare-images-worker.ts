import { Hono } from "hono";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";

type ImagesEnv = AuthRuntimeEnv & {
  IMAGES: ImagesBinding;
  IMAGES_MAX_INPUT_BYTES: string;
  IMAGES_DEFAULT_FORMAT: "image/webp" | "image/avif" | "image/jpeg" | "image/png";
};

export async function transformCloudflareImage(
  env: ImagesEnv,
  input: ReadableStream<Uint8Array>,
  options: { width?: number; height?: number; format?: ImagesEnv["IMAGES_DEFAULT_FORMAT"] },
) {
  const width = options.width === undefined ? undefined : Math.floor(options.width);
  const height = options.height === undefined ? undefined : Math.floor(options.height);
  if ((width !== undefined && (width < 1 || width > 4096)) || (height !== undefined && (height < 1 || height > 4096)))
    throw new RangeError("Image width and height must be between 1 and 4096.");
  const output = await env.IMAGES.input(input)
    .transform({ ...(width ? { width } : {}), ...(height ? { height } : {}), fit: "scale-down" })
    .output({ format: options.format || env.IMAGES_DEFAULT_FORMAT });
  return output.response();
}

const feature = new Hono<{ Bindings: AuthRuntimeEnv }>();

feature.post("/api/admin/images/test", (c) => withRequestAuth(c.env, c.executionCtx, async (auth) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const roles = String(session?.user?.role || "").split(",").map((role) => role.trim());
  if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
  if (!roles.includes("admin")) return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403);
  const source = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAE0lEQVQImWP4z8DwnwGM/zMwAAAf7gP9qS/A4gAAAABJRU5ErkJggg==";
  const bytes = Uint8Array.from(atob(source), (character) => character.charCodeAt(0));
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes); controller.close(); } });
  const response = await transformCloudflareImage(c.env as ImagesEnv, stream, { width: 1, height: 1, format: "image/webp" });
  return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") || "image/webp", "Cache-Control": "no-store", "X-Starter-Images-Test": "passed" } });
}));

export const cloudflareImagesFeature = feature;
