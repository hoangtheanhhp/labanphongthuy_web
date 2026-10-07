// Cloudflare Pages Function: /api/xsmb
// Proxies request directly from Cloudflare edge servers to Minh Ngoc, completely avoiding browser CORS & 3rd-party proxy issues.

export async function onRequest(context: { request: Request }): Promise<Response> {
  const url = new URL(context.request.url);
  const date = url.searchParams.get('date'); // e.g. 06-10-2026

  const targetUrl = date
    ? `https://www.minhngoc.net.vn/getkqxs/mien-bac/${date}.js`
    : `https://www.minhngoc.net.vn/getkqxs/mien-bac.js`;

  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=15', // cache 15s at edge
  });

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.minhngoc.net.vn/',
      },
    });

    if (!upstreamRes.ok) {
      return new Response(`Upstream error: ${upstreamRes.statusText}`, {
        status: upstreamRes.status,
        headers,
      });
    }

    const text = await upstreamRes.text();
    return new Response(text, { headers });
  } catch (err: any) {
    return new Response(`Proxy error: ${err.message}`, {
      status: 502,
      headers,
    });
  }
}
