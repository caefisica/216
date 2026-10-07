import { headers } from "next/headers";

/**
 * The caller's address as Cloudflare saw it. `x-forwarded-for` is not used: the client sends it,
 * so a fresh value per request would give every attempt its own rate-limit key.
 */
export async function getClientIp(): Promise<string> {
  return (await headers()).get("cf-connecting-ip") ?? "unknown";
}
