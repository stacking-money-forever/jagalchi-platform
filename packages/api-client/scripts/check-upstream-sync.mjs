import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const upstreamArgument = process.argv[2] ?? process.env.JAGALCHI_API_OPENAPI;
if (!upstreamArgument) {
  throw new Error(
    "Pass the canonical jagalchi-api contracts/openapi.json path",
  );
}

const snapshotPath = new URL("../contract/openapi.json", import.meta.url);
const upstreamPath = path.resolve(upstreamArgument);
const [snapshot, upstream] = await Promise.all([
  readFile(snapshotPath),
  readFile(upstreamPath),
]);
const digest = (value) => createHash("sha256").update(value).digest("hex");
const snapshotHash = digest(snapshot);
const upstreamHash = digest(upstream);

if (!snapshot.equals(upstream)) {
  throw new Error(
    `API contract sync pending: platform=${snapshotHash} canonical-api=${upstreamHash}`,
  );
}

console.log(`Canonical API contract synchronized: ${snapshotHash}`);
