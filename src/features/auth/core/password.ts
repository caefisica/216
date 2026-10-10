import { sha1 } from "@oslojs/crypto/sha1";
import { encodeHexLowerCase } from "@oslojs/encoding";

export const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await deriveKey(password, salt, ITERATIONS);
  const saltHex = encodeHexLowerCase(salt);
  const hashHex = encodeHexLowerCase(key);
  return `$pbkdf2-sha256$${ITERATIONS}$${saltHex}$${hashHex}`;
}

export async function verifyPasswordHash(stored: string, candidate: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 5 || parts[1] !== "pbkdf2-sha256") return false;
  const iterations = parseInt(parts[2], 10);
  const salt = hexToBytes(parts[3]);
  const storedHash = parts[4];
  const key = await deriveKey(candidate, salt, iterations);
  const candidateHash = encodeHexLowerCase(key);
  return timingSafeEqual(storedHash, candidateHash);
}

export async function verifyPasswordStrength(password: string): Promise<boolean> {
  if (password.length < 8 || password.length > 255) return false;
  const hash = encodeHexLowerCase(sha1(new TextEncoder().encode(password)));
  const hashPrefix = hash.slice(0, 5);
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`);
    if (!response.ok) return true;
    const data = await response.text();
    for (const item of data.split("\n")) {
      const suffix = item.slice(0, 35).toLowerCase();
      if (hash === hashPrefix + suffix) return false;
    }
  } catch {
    return true;
  }
  return true;
}

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const buffer = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    KEY_BYTES * 8,
  );
  return new Uint8Array(buffer);
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
