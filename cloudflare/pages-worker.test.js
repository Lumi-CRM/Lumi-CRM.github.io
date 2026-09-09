import assert from 'node:assert/strict'
import test from 'node:test'
import worker from '../public/_worker.js'

test('Pages serves the SPA entry point for missing HTML navigation routes', async () => {
  const requests = []
  const env = {
    ASSETS: {
      fetch: async request => {
        requests.push(request.url)
        return new Response(request.url.endsWith('/contacts') ? 'missing' : 'app', {
          status: request.url.endsWith('/contacts') ? 404 : 200,
        })
      },
    },
  }

  const response = await worker.fetch(new Request('https://lumicrm.pages.dev/contacts', {
    headers: { accept: 'text/html,application/xhtml+xml' },
  }), env)

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('x-lumicrm-pages'), 'spa-fallback')
  assert.equal(await response.text(), 'app')
  assert.deepEqual(requests, [
    'https://lumicrm.pages.dev/contacts',
    'https://lumicrm.pages.dev/',
  ])
})

test('Pages preserves asset 404 responses instead of returning HTML', async () => {
  const env = { ASSETS: { fetch: async () => new Response('missing', { status: 404 }) } }
  const response = await worker.fetch(new Request('https://lumicrm.pages.dev/missing.js', {
    headers: { accept: '*/*' },
  }), env)
  assert.equal(response.status, 404)
})
