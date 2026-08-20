import { defineConfig } from 'vite'
import type { Plugin, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { validateAssemblyContracts } from '../../scripts/lib/assembly.mjs'

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

function isLoopbackHost(value: string | undefined) {
  if (!value) return false
  try {
    return new Set(['localhost', '127.0.0.1', '[::1]']).has(new URL(`http://${value}`).hostname)
  } catch {
    return false
  }
}

function isLoopbackOrigin(value: string | undefined) {
  if (!value) return false
  try {
    return new Set(['localhost', '127.0.0.1', '[::1]']).has(new URL(value).hostname)
  } catch {
    return false
  }
}

function localSetupApi(): Plugin {
  return {
    name: 'starter-local-setup-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
        const url = new URL(request.url || '/', 'http://starter.local')
        if (url.pathname !== '/__starter/setup') return next()
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        if (!isLoopbackHost(request.headers.host) || (request.method === 'PUT' && !isLoopbackOrigin(request.headers.origin))) {
          response.statusCode = 403
          response.end(json({ error: 'Setup requests must originate from localhost.' }))
          return
        }

        try {
          const [manifestSource, blueprintSource, catalogSource, designCatalogSource, configSource] = await Promise.all([
            readFile(path.join(repositoryRoot, 'starter.manifest.json'), 'utf8'),
            readFile(path.join(repositoryRoot, 'starter.blueprint.json'), 'utf8'),
            readFile(path.join(repositoryRoot, 'catalog/catalog.json'), 'utf8'),
            readFile(path.join(repositoryRoot, 'design/catalog.json'), 'utf8'),
            readFile(path.join(repositoryRoot, 'starter.config.json'), 'utf8'),
          ])
          const manifest = JSON.parse(manifestSource)
          const catalog = JSON.parse(catalogSource)
          const designCatalog = JSON.parse(designCatalogSource)
          const config = JSON.parse(configSource)

          if (request.method === 'GET') {
            response.statusCode = 200
            response.end(json({ blueprint: JSON.parse(blueprintSource), catalog, designCatalog, config }))
            return
          }
          if (request.method !== 'PUT') {
            response.statusCode = 405
            response.end(json({ error: 'Method not allowed.' }))
            return
          }

          let body = ''
          for await (const chunk of request) {
            body += chunk
            if (body.length > 524288) throw new Error('Setup payload is too large.')
          }
          const payload = JSON.parse(body)
          const blueprint = payload.blueprint
          const nextConfig = payload.config
          if (!blueprint || !nextConfig) throw new Error('Blueprint and Starter configuration are required.')
          if (blueprint.project?.name !== nextConfig.project?.name || blueprint.project?.slug !== nextConfig.project?.slug) throw new Error('Blueprint and Starter configuration identities must match.')
          const nextManifest = { ...manifest, project: { name: blueprint.project.name, slug: blueprint.project.slug } }
          const failures = validateAssemblyContracts(nextManifest, blueprint, catalog, designCatalog)
          if (failures.length) {
            response.statusCode = 400
            response.end(json({ error: 'Blueprint validation failed.', failures }))
            return
          }

          const blueprintPath = path.join(repositoryRoot, 'starter.blueprint.json')
          const configPath = path.join(repositoryRoot, 'starter.config.json')
          const blueprintTemporaryPath = path.join(repositoryRoot, '.starter.blueprint.json.tmp')
          const configTemporaryPath = path.join(repositoryRoot, '.starter.config.json.tmp')
          const resetIdentity = manifest.project?.slug === 'starter' && blueprint.project.slug !== 'starter'
          nextConfig.email.provider = blueprint.providers.email.default
          await Promise.all([
            writeFile(blueprintTemporaryPath, json(blueprint), { encoding: 'utf8', mode: 0o600 }),
            writeFile(configTemporaryPath, json(nextConfig), { encoding: 'utf8', mode: 0o600 }),
          ])
          await rename(blueprintTemporaryPath, blueprintPath)
          await rename(configTemporaryPath, configPath)
          try {
            execFileSync(process.execPath, ['scripts/sync-project-identity.mjs', ...(resetIdentity ? ['--reset'] : [])], { cwd: repositoryRoot, stdio: 'pipe' })
            execFileSync(process.execPath, ['scripts/build-dp.mjs'], { cwd: repositoryRoot, stdio: 'pipe' })
          } catch (error) {
            await Promise.all([
              writeFile(blueprintPath, blueprintSource, 'utf8'),
              writeFile(configPath, configSource, 'utf8'),
            ])
            execFileSync(process.execPath, ['scripts/sync-project-identity.mjs'], { cwd: repositoryRoot, stdio: 'pipe' })
            execFileSync(process.execPath, ['scripts/build-dp.mjs'], { cwd: repositoryRoot, stdio: 'pipe' })
            throw error
          }
          response.statusCode = 200
          response.end(json({ blueprint, catalog, designCatalog, config: nextConfig }))
        } catch (error) {
          response.statusCode = 400
          response.end(json({ error: error instanceof Error ? error.message : String(error) }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [localSetupApi(), react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: '../../dist/web', emptyOutDir: true },
})
