import { copyFile, readFile, readdir, writeFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const distDirectory = fileURLToPath(new URL('../dist', import.meta.url))

const productionEnv = await readFile(new URL('../.env.production', import.meta.url), 'utf8')
const publicKey = process.env.VITE_SUPABASE_ANON_KEY
  || productionEnv.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m)?.[1].trim()
if (!publicKey || !/^[a-zA-Z0-9_.-]+$/.test(publicKey)) throw new Error('Invalid diagnostic publishable key')
const diagnosticPath = resolve(distDirectory, 'network-check.html')
const diagnosticHtml = await readFile(diagnosticPath, 'utf8')
await writeFile(diagnosticPath, diagnosticHtml.replace('__LUMICRM_DIAGNOSTIC_PUBLIC_KEY__', publicKey), 'utf8')

// GitHub Pages needs a copied 404.html for client-side routes. Cloudflare Pages
// provides its own SPA fallback only when a top-level 404.html is absent.
if (process.env.CF_PAGES !== '1') {
  await copyFile(resolve(distDirectory, 'index.html'), resolve(distDirectory, '404.html'))
}

const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(entry => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? collectFiles(path) : path
  }))
  return files.flat()
}

const offlineAssets = (await collectFiles(distDirectory))
  .map(path => `/${relative(distDirectory, path).split(sep).join('/')}`)
  .filter(path => path !== '/sw.js' && path !== '/offline-assets.json')

await writeFile(resolve(distDirectory, 'offline-assets.json'), JSON.stringify(offlineAssets), 'utf8')
