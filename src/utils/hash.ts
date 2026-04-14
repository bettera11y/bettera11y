import { createHash } from "node:crypto";

export function getSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
