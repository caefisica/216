import { headers } from "next/headers";

export async function getClientIp(): Promise<string> {
  return (await headers()).get("cf-connecting-ip") ?? "unknown";
}
