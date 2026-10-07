import { getFile } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const object = await getFile(key.join("/"));
  if (!object) return new Response("Not found", { status: 404 });

  const contentType = object.httpMetadata?.contentType ?? "application/octet-stream";
  const isImage = contentType.startsWith("image/");

  return new Response(object.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": isImage ? "inline" : "attachment",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: object.httpEtag,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
