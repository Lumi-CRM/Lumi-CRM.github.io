const UPSTREAM = 'https://flwsglkkarikekkopdbu.supabase.co'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,range,x-upsert',
  'Access-Control-Expose-Headers': 'content-length,content-range,x-lumicrm-gateway',
  'Access-Control-Max-Age': '86400',
}

const withCors = (headers) => {
  const result = new Headers(headers)
  for (const [key, value] of Object.entries(corsHeaders)) result.set(key, value)
  result.set('x-lumicrm-gateway', 'cloudflare')
  result.set('cache-control', 'no-store')
  return result
}

export default {
  async fetch(request) {
    const incoming = new URL(request.url)

    if (incoming.pathname === '/__health') {
      return Response.json({ ok: true, service: 'LumiCRM gateway' }, { headers: withCors() })
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: withCors() })
    }

    const upstream = new URL(incoming.pathname + incoming.search, UPSTREAM)

    try {
      const upstreamRequest = new Request(upstream, request)
      const upgrade = request.headers.get('upgrade')
      if (upgrade && upgrade.toLowerCase() === 'websocket') return fetch(upstreamRequest)

      const response = await fetch(upstreamRequest, { redirect: 'manual' })
      const headers = withCors(response.headers)
      const location = headers.get('location')
      if (location) headers.set('location', location.replace(UPSTREAM, incoming.origin))

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    } catch {
      return Response.json(
        { message: 'LumiCRM cloud gateway is temporarily unavailable' },
        { status: 502, headers: withCors() },
      )
    }
  },
}
