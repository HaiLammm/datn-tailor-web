const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const PASSTHROUGH_HEADERS = [
  "accept-ranges",
  "cache-control",
  "content-length",
  "content-type",
  "etag",
  "last-modified",
] as const;

type UploadRouteContext = {
  params: Promise<{ path: string[] }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildResponseHeaders(source: Headers): Headers {
  const headers = new Headers();

  for (const name of PASSTHROUGH_HEADERS) {
    const value = source.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  return headers;
}

async function proxyUpload(request: Request, context: UploadRouteContext): Promise<Response> {
  const { path } = await context.params;

  if (!path.length) {
    return new Response("Not Found", { status: 404 });
  }

  const upstreamUrl = new URL(
    `/uploads/${path.map((segment) => encodeURIComponent(segment)).join("/")}`,
    BACKEND_URL
  );
  upstreamUrl.search = new URL(request.url).search;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      cache: "no-store",
    });

    return new Response(request.method === "HEAD" ? null : upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: buildResponseHeaders(upstreamResponse.headers),
    });
  } catch {
    return new Response("Unable to load upload", { status: 502 });
  }
}

export async function GET(request: Request, context: UploadRouteContext) {
  return proxyUpload(request, context);
}

export async function HEAD(request: Request, context: UploadRouteContext) {
  return proxyUpload(request, context);
}
