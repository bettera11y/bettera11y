import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

export function getSha256(value: string): string {
    return bytesToHex(sha256(new TextEncoder().encode(value)));
}
