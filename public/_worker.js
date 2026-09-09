const isHtmlNavigation = request =>
  request.method === 'GET'
  && (request.headers.get('accept') || '').includes('text/html')

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404 || !isHtmlNavigation(request)) return response

    const indexUrl = new URL('/', request.url)
    const index = await env.ASSETS.fetch(new Request(indexUrl, request))
    const headers = new Headers(index.headers)
    headers.set('x-lumicrm-pages', 'spa-fallback')
    return new Response(index.body, { status: 200, headers })
  },
}
