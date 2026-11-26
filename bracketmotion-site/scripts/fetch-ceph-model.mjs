import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const file = path.resolve("public/models/cephvit-dynamic-int8.onnx");
const temp = file + ".part";
const release = "https://github.com/omariwest/dentaistudy-site/releases/download/cephvit-web-v1/cephvit-dynamic-int8.onnx";
const sha = "0d3984e6809a1708f2e41645162273d88e1763f7b03d4e1b3438e5ab8d045044";
const size = 90531621;

async function valid(filepath) {
  try {
    if ((await stat(filepath)).size !== size) return false;
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(filepath)) hash.update(chunk);
    return hash.digest("hex") === sha;
  } catch {
    return false;
  }
}

if (!(await valid(file))) {
  await mkdir(path.dirname(file), { recursive: true });
  await rm(temp, { force: true });
  try {
    const response = await fetch(release, { headers: { "User-Agent": "BracketMotion-build" } });
    if (!response.ok || !response.body) {
      throw new Error(\`CephViT model release not available (\${response.status})\`);
    }
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temp));
    if (!(await valid(temp))) throw new Error("CephViT model SHA256/size mismatch");
    await rename(temp, file);
    console.log("Verified CephViT ONNX asset:", sha);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
} else {
  console.log("CephViT model already verified");
}
