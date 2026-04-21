#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const STARTUP_TIMEOUT_MS = 8_000
const SETTLE_TIMEOUT_MS = 1_500
const TOTAL_TIMEOUT_MS = 15_000

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function parseArgs(argv) {
  let workspace = process.cwd()
  const files = []
  let code = null

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--workspace') {
      workspace = argv[++i]
      continue
    }

    if (arg === '--file') {
      files.push(argv[++i])
      continue
    }

    if (arg === '--files') {
      files.push(...argv[++i].split(',').filter(Boolean))
      continue
    }

    if (arg === '--code') {
      code = argv[++i]
      continue
    }

    fail(`Unknown argument: ${arg}`)
  }

  if (files.length === 0) {
    fail('At least one --file or --files value required')
  }

  return {
    workspace: path.resolve(workspace),
    files: [...new Set(files.map((file) => path.resolve(workspace, file)))],
    code
  }
}

function detectPackageManager(workspace) {
  const packageJsonPath = path.join(workspace, 'package.json')
  if (existsSync(packageJsonPath)) {
    try {
      const value = JSON.parse(readFileSync(packageJsonPath, 'utf8')).packageManager
      const manager = typeof value === 'string' ? value.split('@')[0] : null
      if (manager === 'npm' || manager === 'pnpm' || manager === 'bun') {
        return manager
      }
    } catch {
      // Ignore malformed package.json.
    }
  }

  if (existsSync(path.join(workspace, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(path.join(workspace, 'package-lock.json'))) return 'npm'
  if (existsSync(path.join(workspace, 'npm-shrinkwrap.json'))) return 'npm'
  if (existsSync(path.join(workspace, 'yarn.lock'))) return 'yarn'
  if (existsSync(path.join(workspace, 'bun.lock'))) return 'bun'
  if (existsSync(path.join(workspace, 'bun.lockb'))) return 'bun'

  return null
}

function commandFor(manager) {
  if (manager === 'pnpm')
    return [
      'pnpm',
      ['--package=@tailwindcss/language-server', 'dlx', 'tailwindcss-language-server', '--stdio']
    ]
  if (manager === 'npm')
    return [
      'npx',
      ['-y', '--package', '@tailwindcss/language-server', 'tailwindcss-language-server', '--stdio']
    ]
  if (manager === 'yarn')
    return [
      'yarn',
      ['dlx', '-p', '@tailwindcss/language-server', 'tailwindcss-language-server', '--stdio']
    ]
  if (manager === 'bun')
    return [
      'bunx',
      ['--package', '@tailwindcss/language-server', 'tailwindcss-language-server', '--stdio']
    ]
  return null
}

function languageIdFor(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.js':
    case '.cjs':
    case '.mjs':
      return 'javascript'
    case '.jsx':
      return 'javascriptreact'
    case '.ts':
    case '.cts':
    case '.mts':
      return 'typescript'
    case '.tsx':
      return 'typescriptreact'
    case '.html':
      return 'html'
    case '.vue':
      return 'vue'
    case '.svelte':
      return 'svelte'
    case '.astro':
      return 'astro'
    case '.css':
      return 'css'
    default:
      return 'plaintext'
  }
}

function normalizeCode(code) {
  if (typeof code === 'string') return code
  if (typeof code === 'number') return String(code)
  if (code && typeof code === 'object' && typeof code.value === 'string') return code.value
  return null
}

function normalizeSeverity(severity) {
  if (severity === 1) return 'error'
  if (severity === 2) return 'warning'
  if (severity === 3) return 'info'
  if (severity === 4) return 'hint'
  return 'unknown'
}

function createLsp(child) {
  let nextId = 1
  let buffer = Buffer.alloc(0)
  const pending = new Map()
  const notificationHandlers = new Map()

  function sendResult(id, result) {
    send({ jsonrpc: '2.0', id, result })
  }

  function configFor(section) {
    if (!section || section === 'tailwindCSS') {
      return {
        validate: true,
        lint: {
          suggestCanonicalClasses: 'warning'
        }
      }
    }

    return null
  }

  function send(message) {
    const body = Buffer.from(JSON.stringify(message), 'utf8')
    child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`)
    child.stdin.write(body)
  }

  function request(method, params) {
    const id = nextId
    nextId += 1

    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      send({ jsonrpc: '2.0', id, method, params })
    })
  }

  function notify(method, params) {
    send({ jsonrpc: '2.0', method, params })
  }

  function on(method, handler) {
    const handlers = notificationHandlers.get(method) ?? []
    handlers.push(handler)
    notificationHandlers.set(method, handlers)
  }

  function handle(message) {
    if (typeof message.id !== 'undefined' && !message.method) {
      const entry = pending.get(message.id)
      if (!entry) return
      pending.delete(message.id)
      if (message.error) {
        entry.reject(new Error(message.error.message ?? 'LSP request failed'))
        return
      }
      entry.resolve(message.result)
      return
    }

    if (typeof message.id !== 'undefined' && message.method) {
      if (message.method === 'workspace/configuration') {
        sendResult(
          message.id,
          (message.params?.items ?? []).map((item) => configFor(item.section))
        )
        return
      }

      sendResult(message.id, null)
      return
    }

    if (!message.method) return
    for (const handler of notificationHandlers.get(message.method) ?? []) {
      handler(message.params)
    }
  }

  child.stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk])

    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n')
      if (headerEnd === -1) return

      const header = buffer.subarray(0, headerEnd).toString('utf8')
      const match = header.match(/Content-Length:\s*(\d+)/i)
      if (!match) fail('Missing Content-Length header from language server')

      const contentLength = Number(match[1])
      const messageEnd = headerEnd + 4 + contentLength
      if (buffer.length < messageEnd) return

      const body = buffer.subarray(headerEnd + 4, messageEnd).toString('utf8')
      buffer = buffer.subarray(messageEnd)
      handle(JSON.parse(body))
    }
  })

  child.on('exit', (code, signal) => {
    if (code === 0 || signal === 'SIGTERM') return
    const error = new Error(
      `Tailwind language server exited early (code=${code}, signal=${signal ?? 'none'})`
    )
    for (const entry of pending.values()) {
      entry.reject(error)
    }
    pending.clear()
  })

  return { request, notify, on }
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const manager = detectPackageManager(args.workspace)
  if (!manager) fail('Could not detect package manager for Tailwind diagnostics')

  const command = commandFor(manager)
  if (!command) fail(`Unsupported package manager: ${manager}`)

  const [binary, commandArgs] = command
  const child = spawn(binary, commandArgs, {
    cwd: args.workspace,
    stdio: ['pipe', 'pipe', 'pipe']
  })

  let stderr = ''
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString('utf8')
  })
  child.on('error', (error) => {
    fail(`Failed to start Tailwind language server: ${error.message}`)
  })

  const lsp = createLsp(child)
  const diagnosticsByFile = new Map()
  const targetFiles = new Set(args.files)
  let lastDiagnosticAt = 0

  lsp.on('textDocument/publishDiagnostics', (params) => {
    const filePath = path.normalize(fileURLToPath(params.uri))
    if (!targetFiles.has(filePath)) return
    diagnosticsByFile.set(filePath, params.diagnostics ?? [])
    lastDiagnosticAt = Date.now()
  })

  const rootUri = pathToFileURL(args.workspace).href

  const startupTimeout = setTimeout(() => {
    child.kill('SIGTERM')
    const details = stderr.trim() ? `\n${stderr.trim()}` : ''
    fail(`Timed out starting Tailwind language server${details}`)
  }, STARTUP_TIMEOUT_MS)

  try {
    await lsp.request('initialize', {
      processId: process.pid,
      rootUri,
      capabilities: {
        textDocument: { publishDiagnostics: {} },
        workspace: { configuration: true }
      },
      workspaceFolders: [{ uri: rootUri, name: path.basename(args.workspace) }]
    })
  } catch (error) {
    clearTimeout(startupTimeout)
    child.kill('SIGTERM')
    const details = stderr.trim() ? `\n${stderr.trim()}` : ''
    fail(`${error instanceof Error ? error.message : String(error)}${details}`)
  }

  clearTimeout(startupTimeout)
  lsp.notify('initialized', {})

  for (const filePath of args.files) {
    lsp.notify('textDocument/didOpen', {
      textDocument: {
        uri: pathToFileURL(filePath).href,
        languageId: languageIdFor(filePath),
        version: 1,
        text: readFileSync(filePath, 'utf8')
      }
    })
  }

  const startedAt = Date.now()
  while (true) {
    const now = Date.now()
    // Wait for diagnostics to settle. Files with no warnings may never emit
    // publishDiagnostics — that is fine, diagnosticsByFile.get() ?? [] handles it.
    const settled = lastDiagnosticAt !== 0 && now - lastDiagnosticAt >= SETTLE_TIMEOUT_MS

    if (settled) break

    if (now - startedAt >= TOTAL_TIMEOUT_MS) {
      // No diagnostics published after full wait — language server ran but found
      // nothing (clean files) or couldn't detect the project. Either way, output
      // an empty array rather than crashing; the startup timeout above already
      // handles the case where the server never initialized at all.
      child.kill('SIGTERM')
      break
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  const output = []
  for (const filePath of args.files) {
    for (const diagnostic of diagnosticsByFile.get(filePath) ?? []) {
      const code = normalizeCode(diagnostic.code)
      if (args.code && code !== args.code) continue

      output.push({
        file: path.relative(args.workspace, filePath),
        source: diagnostic.source ?? 'tailwindcss',
        code,
        severity: normalizeSeverity(diagnostic.severity),
        message: diagnostic.message,
        range: {
          startLine: diagnostic.range.start.line + 1,
          startCol: diagnostic.range.start.character + 1,
          endLine: diagnostic.range.end.line + 1,
          endCol: diagnostic.range.end.character + 1
        }
      })
    }
  }

  child.kill('SIGTERM')
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
}

run().catch((error) => {
  fail(error instanceof Error ? error.message : String(error))
})
