const INVITE = /^https:\/\/(chat\.whatsapp\.com|wa\.me)\//i;

function renderBase(): string {
  return (process.env.API_URL ?? "").trim().replace(/\/$/, "");
}

function localWhatsAppResponse(): Response {
  const url = process.env.WHATSAPP_INVITE_URL?.trim() ?? "";
  return Response.json({
    whatsappInviteUrl: INVITE.test(url) ? url : null,
  });
}

export async function handleApi(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const base = renderBase();

  if (!base) {
    if (incoming.pathname === "/api/config") {
      return localWhatsAppResponse();
    }
    return Response.json({ error: "API_URL is not configured" }, { status: 503 });
  }

  const target = `${base}${incoming.pathname}${incoming.search}`;
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
