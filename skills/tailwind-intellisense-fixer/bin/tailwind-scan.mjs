#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SEARCH_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.jsx', '.ts', '.cts', '.mts', '.tsx', '.html', '.vue', '.svelte', '.astro', '.css'])
const SEARCH_GLOBS = ['*.js', '*.cjs', '*.mjs', '*.jsx', '*.ts', '*.cts', '*.mts', '*.tsx', '*.html', '*.vue', '*.svelte', '*.astro', '*.css']
const SEARCH_PATTERNS = [
  'className=',
  'class=',
  'clsx\\(',
  'cn\\(',
  'cva\\(',
  'tw`',
  'tw\\(',
  '@apply',
  '@theme',
  '@utility',
  '@variant',
  '@import\\s+["\']tailwindcss["\']',
]
const SEARCH_REGEX = /className=|class=|clsx\(|cn\(|cva\(|tw`|tw\(|@apply|@theme|@utility|@variant|@import\s+["']tailwindcss["']/
const SKIP_DIRS = new Set(['.git', 'node_modules', '.next', '.nuxt', '.svelte-kit', 'dist', 'build', 'coverage'])

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function parseArgs(argv) {
  let workspace = process.cwd()
  let code = 'suggestCanonicalClasses'
  let discoverOnly = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--workspace') {
      workspace = argv[++i]
      continue
    }

    if (arg === '--code') {
      code = argv[++i]
      continue
    }

    if (arg === '--discover-only') {
      discoverOnly = true
      continue
    }

    fail(`Unknown argument: ${arg}`)
  }

  return {
    workspace: path.resolve(workspace),
    code,
    discoverOnly,
  }
}

function relativeExcludes(workspace) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  const relativeScriptDir = path.relative(workspace, scriptDir)
  if (!relativeScriptDir || relativeScriptDir.startsWith('..')) return []
  return [relativeScriptDir, `${relativeScriptDir}${path.sep}`]
}

function isExcluded(relativePath, excludes) {
  return excludes.some((prefix) => relativePath === prefix || relativePath.startsWith(prefix))
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    const stdout = []
    const stderr = []

    child.stdout.on('data', (chunk) => stdout.push(chunk))
    child.stderr.on('data', (chunk) => stderr.push(chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({
        code,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr).toString('utf8'),
      })
    })
  })
}

async function discoverFiles(workspace) {
  const excludes = relativeExcludes(workspace)

  try {
    return await discoverFilesWithRipgrep(workspace, excludes)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return discoverFilesWithNode(workspace, excludes)
    }

    throw error
  }
}

async function discoverFilesWithRipgrep(workspace, excludes) {
  const args = ['-l', '-0']

  for (const glob of SEARCH_GLOBS) {
    args.push('-g', glob)
  }

  for (const pattern of SEARCH_PATTERNS) {
    args.push('-e', pattern)
  }

  args.push('.')

  const result = await runCommand('rg', args, workspace)
  if (result.code !== 0 && result.code !== 1) {
    const details = result.stderr.trim() ? `\n${result.stderr.trim()}` : ''
    fail(`Failed to discover Tailwind files with ripgrep${details}`)
  }

  if (result.stdout.length === 0) return []

  return result.stdout
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter((file) => !isExcluded(file, excludes))
    .sort((left, right) => left.localeCompare(right))
}

function discoverFilesWithNode(workspace, excludes) {
  const files = []
  const queue = ['.']

  while (queue.length > 0) {
    const relativeDir = queue.pop()
    const absoluteDir = path.join(workspace, relativeDir)

    for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') && entry.name !== '.storybook') {
        if (entry.isDirectory()) continue
      }

      const relativePath = relativeDir === '.' ? entry.name : path.posix.join(relativeDir, entry.name)
      if (isExcluded(relativePath, excludes)) continue

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          queue.push(relativePath)
        }
        continue
      }

      if (!SEARCH_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue

      try {
        const text = readFileSync(path.join(workspace, relativePath), 'utf8')
        if (SEARCH_REGEX.test(text)) {
          files.push(relativePath)
        }
      } catch {
        // Ignore unreadable files during discovery.
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right))
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const files = await discoverFiles(args.workspace)

  if (args.discoverOnly) {
    process.stdout.write(`${JSON.stringify(files, null, 2)}\n`)
    return
  }

  if (files.length === 0) {
    process.stdout.write('[]\n')
    return
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  const diagnosticsScript = path.join(scriptDir, 'tailwind-diagnostics.mjs')
  const commandArgs = [diagnosticsScript, '--workspace', args.workspace, '--files', files.join(',')]

  if (args.code) {
    commandArgs.push('--code', args.code)
  }

  const result = await runCommand(process.execPath, commandArgs, args.workspace)
  if (result.code !== 0) {
    const details = result.stderr.trim() ? `\n${result.stderr.trim()}` : ''
    fail(`Tailwind scan failed${details}`)
  }

  process.stdout.write(result.stdout)
}

run().catch((error) => {
  fail(error instanceof Error ? error.message : String(error))
})
