const NAMESPACE = "9f1c2b84-5a7e-4d36-8c10-216216216216";

const toBytes = (uuid: string) =>
  Uint8Array.from(uuid.replaceAll("-", "").match(/../g)!, (pair) => parseInt(pair, 16));

/**
 * A version 5 UUID: the same name always gives the same id, so every host that loads the
 * register ends up with identical rows and a later load finds the rows it already wrote.
 */
export async function stableId(name: string) {
  const namespace = toBytes(NAMESPACE);
  const text = new TextEncoder().encode(name);
  const input = new Uint8Array(namespace.length + text.length);
  input.set(namespace);
  input.set(text, namespace.length);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-1", input)).slice(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
