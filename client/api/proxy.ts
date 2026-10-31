const INVITE = /^https:\/\/(chat\.whatsapp\.com|wa\.me)\//i;

function renderBase(): string {
  return (process.env.API_URL ?? "").trim().replace(/\/$/, "");
}

function resolvePath(request: Request): { pathname: string; search: string } {
  const incoming = new URL(request.url);
  const rewritten = incoming.searchParams.get("path");
  if (rewritten) {
    incoming.searchParams.delete("path");
    const pathname = rewritten.startsWith("/") ? rewritten : `/api/${rewritten}`;
    return { pathname, search: incoming.search };
  }
  return { pathname: incoming.pathname, search: incoming.search };
}

export async function handleApi(request: Request): Promise<Response> {
  const { pathname, search } = resolvePath(request);
  const base = renderBase();

  if (!base) {
    if (pathname === "/api/config") {
      const url = process.env.WHATSAPP_INVITE_URL?.trim() ?? "";
      return Response.json({
        whatsappInviteUrl: INVITE.test(url) ? url : null,
      });
    }
    return Response.json({ error: "API_URL is not configured" }, { status: 503 });
  }

  const target = `${base}${pathname}${search}`;
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const name = key.toLowerCase();
    if (name === "host" || name === "connection" || name === "content-length") return;
    headers.set(key, value);
  });

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(target, init);
  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    responseHeaders.append(key, value);
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = handleApi;
export const POST = handleApi;
export const PUT = handleApi;
export const PATCH = handleApi;
export const DELETE = handleApi;
export const OPTIONS = handleApi;
