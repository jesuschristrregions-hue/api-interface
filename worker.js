const UPSTREAM_API_BASE = "https://api.omar-thing.site/";

function withCors(headers, requestOrigin) {
  const result = new Headers(headers);
  result.set("Access-Control-Allow-Origin", requestOrigin || "*");
  result.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  result.set("Access-Control-Allow-Headers", "Content-Type");
  result.set("Vary", "Origin");
  return result;
}

function jsonResponse(payload, status, requestOrigin) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: withCors({ "Content-Type": "application/json; charset=utf-8" }, requestOrigin),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestOrigin = request.headers.get("Origin");

    if (url.pathname === "/api-proxy") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: withCors({}, requestOrigin) });
      }
      if (request.method !== "GET") {
        return jsonResponse({ error: "Method not allowed" }, 405, requestOrigin);
      }

      const upstreamUrl = new URL(UPSTREAM_API_BASE);
      upstreamUrl.search = url.search;

      try {
        const upstream = await fetch(upstreamUrl.toString(), {
          method: "GET",
          headers: { Accept: "application/json, text/plain, */*" },
        });

        return new Response(upstream.body, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: withCors(upstream.headers, requestOrigin),
        });
      } catch (error) {
        return jsonResponse(
          { error: "Proxy request failed", detail: error instanceof Error ? error.message : String(error) },
          502,
          requestOrigin
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
};
