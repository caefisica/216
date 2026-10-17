import { getCloudflareContext } from "@opennextjs/cloudflare";

async function getBucket() {
  const context = getCloudflareContext();
  const bucket = context.env._216_storage;

  if (!bucket) {
    throw new Error(
      "R2 bucket binding '_216_storage' not found. Ensure it is defined in wrangler.jsonc.",
    );
  }

  return bucket;
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | Blob | ReadableStream | string,
  contentType?: string,
) {
  const bucket = await getBucket();
  return putFileInBucket(bucket, key, body, contentType);
}

function putFileInBucket(
  bucket: R2Bucket,
  key: string,
  body: Buffer | Uint8Array | Blob | ReadableStream | string,
  contentType?: string,
) {
  return bucket.put(key, body, { httpMetadata: { contentType } });
}

function deleteFileFromBucket(bucket: R2Bucket, key: string) {
  return bucket.delete(key);
}

export async function deleteFile(key: string) {
  const bucket = await getBucket();
  return deleteFileFromBucket(bucket, key);
}

export async function fileExists(key: string) {
  const bucket = await getBucket();
  return (await bucket.head(key)) !== null;
}

const MEDIA_PREFIX = "/media/";

/** The URL the app serves an object from. See `src/app/media`. */
export function getFileUrl(key: string) {
  return MEDIA_PREFIX + key.split("/").map(encodeURIComponent).join("/");
}

/** The object key behind a URL from `getFileUrl`, or null for any other URL. */
export function getFileKey(url: string) {
  if (!url.startsWith(MEDIA_PREFIX)) return null;
  try {
    return url.slice(MEDIA_PREFIX.length).split("/").map(decodeURIComponent).join("/");
  } catch {
    return null;
  }
}

export async function getFile(key: string) {
  const bucket = await getBucket();
  return await bucket.get(key);
}
