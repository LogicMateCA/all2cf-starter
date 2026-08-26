import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const output = path.resolve("dist/web");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "README.txt"), "This product has no public website output.\n");
console.log("Created an explicit empty public-site output for the mobile-only product.");
