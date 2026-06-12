#!/usr/bin/env node
// Smoke test: real MCP handshake over stdio against the built server.
//   1. initialize → expect serverInfo
//   2. tools/list → expect extract_action_items
//   3. tools/call extract_action_items with a 2-line transcript → expect ≥1 action item
//
// Usage:
//   node test/smoke.mjs                                  # against the default base URL
//   ACTIONS_XYZ_BASE_URL=http://localhost:3979 node test/smoke.mjs
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const pkgDir = dirname(dirname(fileURLToPath(import.meta.url)))
const serverPath = join(pkgDir, 'dist', 'index.js')

const TRANSCRIPT = [
  'Luis: I will ship the MCP server package by Friday, high priority.',
  'Ana: I can review the README and the install docs on Thursday.',
].join('\n')

const child = spawn(process.execPath, [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: process.env,
})

let buffer = ''
const pending = new Map()

child.stdout.on('data', (chunk) => {
  buffer += chunk.toString()
  let nl
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim()
    buffer = buffer.slice(nl + 1)
    if (!line) continue
    let msg
    try {
      msg = JSON.parse(line)
    } catch {
      continue
    }
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(`RPC error: ${JSON.stringify(msg.error)}`)) : resolve(msg.result)
    }
  }
})

let nextId = 1
function request(method, params, timeoutMs = 90_000) {
  const id = nextId++
  const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`Timeout waiting for ${method}`))
    }, timeoutMs)
    pending.set(id, {
      resolve: (v) => { clearTimeout(timer); resolve(v) },
      reject: (e) => { clearTimeout(timer); reject(e) },
    })
    child.stdin.write(payload + '\n')
  })
}

function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n')
}

function fail(msg) {
  console.error(`SMOKE FAIL: ${msg}`)
  child.kill()
  process.exit(1)
}

try {
  // 1. initialize
  const init = await request('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'smoke-test', version: '0.0.1' },
  })
  if (init?.serverInfo?.name !== 'actions-xyz-mcp') fail(`unexpected serverInfo: ${JSON.stringify(init?.serverInfo)}`)
  notify('notifications/initialized', {})
  console.log(`initialize OK — server ${init.serverInfo.name}@${init.serverInfo.version} (protocol ${init.protocolVersion})`)

  // 2. tools/list
  const list = await request('tools/list', {})
  const tool = (list?.tools ?? []).find((t) => t.name === 'extract_action_items')
  if (!tool) fail(`extract_action_items not in tools/list: ${JSON.stringify(list?.tools?.map((t) => t.name))}`)
  console.log(`tools/list OK — found ${tool.name}`)

  // 3. tools/call with a real 2-line transcript
  const call = await request('tools/call', {
    name: 'extract_action_items',
    arguments: { transcript: TRANSCRIPT },
  })
  if (call?.isError) fail(`tool returned error: ${call.content?.[0]?.text}`)
  const jsonBlock = (call?.content ?? []).map((c) => c.text).find((t) => {
    try { return Array.isArray(JSON.parse(t).actions) } catch { return false }
  })
  if (!jsonBlock) fail(`no JSON actions block in response: ${JSON.stringify(call?.content)}`)
  const parsed = JSON.parse(jsonBlock)
  if (parsed.actions.length < 1) fail(`expected ≥1 action item, got ${parsed.actions.length}`)

  console.log(`tools/call OK — ${parsed.actions.length} action item(s) extracted:`)
  console.log(call.content[0].text)
  console.log('SMOKE PASS')
  child.kill()
  process.exit(0)
} catch (err) {
  fail(err instanceof Error ? err.message : String(err))
}
