import { copyFile, readdir, writeFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const distDirectory = fileURLToPath(new URL('../dist', import.meta.url))
await copyFile(resolve(distDirectory, 'index.html'), resolve(distDirectory, '404.html'))

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
