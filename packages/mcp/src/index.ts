#!/usr/bin/env node
// actions-xyz-mcp — MCP server exposing the actions.xyz free action-item extractor.
//
// One tool: extract_action_items({ transcript }) → calls the public
// POST /api/tools/extract endpoint and returns the extracted action items
// as structured JSON plus a human-readable summary.
//
// The endpoint is the same extraction pipeline that powers the actions.xyz
// product (not a separate toy prompt). It is free and rate-limited per IP.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

// Mirrors the server-side contract in src/app/api/tools/extract/route.ts.
const MAX_INPUT_CHARS = 20_000
const DAILY_LIMIT = 10
const REQUEST_TIMEOUT_MS = 60_000

const BASE_URL = (process.env.ACTIONS_XYZ_BASE_URL ?? 'https://actionsxyz.vercel.app').replace(/\/+$/, '')
const ENDPOINT = `${BASE_URL}/api/tools/extract`

interface ExtractedAction {
  task: string
  description: string
  assignee: string
  assigneeType: 'human' | 'agent'
  priority: 'high' | 'med' | 'low'
  tag: string
  dueDate?: string
}

interface ExtractSuccess {
  actions: ExtractedAction[]
  participants: string[]
  remaining: number
}

interface ExtractError {
  error?: string
  code?: string
  max?: number
}

function errorResult(message: string) {
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: message }],
  }
}

/** Map the endpoint's documented error statuses to messages an agent can act on. */
function mapHttpError(status: number, body: ExtractError, retryAfterHeader: string | null): string {
  const code = body.code ?? 'unknown'
  switch (status) {
    case 400:
      if (code === 'empty_input') {
        return 'The transcript was empty. Provide the meeting transcript or notes text in the `transcript` argument.'
      }
      return `The extraction API rejected the request as invalid (code: ${code}). ${body.error ?? ''}`.trim()
    case 413:
      return `Transcript too long: the free extraction API accepts at most ${(body.max ?? MAX_INPUT_CHARS).toLocaleString('en-US')} characters. Split the transcript into smaller chunks and call the tool once per chunk.`
    case 429: {
      const retryAfterS = retryAfterHeader ? Number(retryAfterHeader) : NaN
      const wait = Number.isFinite(retryAfterS)
        ? `Retry after ~${Math.ceil(retryAfterS / 3600)} hour(s) (${retryAfterS}s).`
        : 'Retry tomorrow.'
      return `Daily free limit reached (${DAILY_LIMIT} extractions/day per IP). ${wait} For more volume, sign up free at https://actionsxyz.vercel.app (5 full meetings/month).`
    }
    case 503:
      return 'The extraction service is temporarily unavailable (upstream model not configured or down). This is not a problem with your input — try again later.'
    case 500:
      return 'Extraction failed on the server. This is usually transient — retry once; if it persists, the transcript may contain content the model could not process.'
    default:
      return `Unexpected response from the extraction API (HTTP ${status}, code: ${code}). ${body.error ?? ''}`.trim()
  }
}

function formatReadable(result: ExtractSuccess): string {
  if (result.actions.length === 0) {
    return 'No action items were found in the transcript.'
  }
  const lines = result.actions.map((a, i) => {
    const due = a.dueDate ? ` — due ${a.dueDate}` : ''
    return `${i + 1}. [${a.priority}] ${a.task} → ${a.assignee} (${a.assigneeType}, ${a.tag})${due}`
  })
  const participants = result.participants.length > 0 ? `\nParticipants: ${result.participants.join(', ')}` : ''
  const quota = Number.isFinite(result.remaining)
    ? `\nFree-tier quota remaining today: ${result.remaining}/${DAILY_LIMIT}`
    : ''
  return `Extracted ${result.actions.length} action item(s):\n${lines.join('\n')}${participants}${quota}`
}

async function extractActionItems(transcript: string) {
  const text = transcript.trim()
  if (!text) {
    return errorResult('The transcript was empty. Provide the meeting transcript or notes text in the `transcript` argument.')
  }
  if (text.length > MAX_INPUT_CHARS) {
    return errorResult(
      `Transcript too long (${text.length.toLocaleString('en-US')} characters): the free extraction API accepts at most ${MAX_INPUT_CHARS.toLocaleString('en-US')}. Split the transcript into smaller chunks and call the tool once per chunk.`,
    )
  }

  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (err) {
    const reason = err instanceof Error && err.name === 'TimeoutError'
      ? `the request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
      : `network error: ${err instanceof Error ? err.message : String(err)}`
    return errorResult(`Could not reach the actions.xyz extraction API at ${ENDPOINT} (${reason}). Check connectivity or set ACTIONS_XYZ_BASE_URL to a reachable deployment.`)
  }

  let body: unknown
  try {
    body = await res.json()
  } catch {
    return errorResult(`The extraction API returned a non-JSON response (HTTP ${res.status}). The deployment at ${BASE_URL} may not expose /api/tools/extract — set ACTIONS_XYZ_BASE_URL to a deployment that does.`)
  }

  if (!res.ok) {
    return errorResult(mapHttpError(res.status, (body ?? {}) as ExtractError, res.headers.get('retry-after')))
  }

  const result = body as ExtractSuccess
  if (!Array.isArray(result.actions)) {
    return errorResult('The extraction API returned an unexpected payload (missing `actions` array).')
  }

  return {
    content: [
      { type: 'text' as const, text: formatReadable(result) },
      {
        type: 'text' as const,
        text: JSON.stringify({ actions: result.actions, participants: result.participants ?? [], remaining: result.remaining }, null, 2),
      },
    ],
  }
}

const server = new McpServer({ name: 'actions-xyz-mcp', version: '0.1.0' })

server.registerTool(
  'extract_action_items',
  {
    title: 'Extract action items',
    description:
      'Extract structured action items from a meeting transcript or free-form notes using the actions.xyz extraction pipeline. ' +
      `Returns a human-readable summary plus JSON: { actions: [{ task, description, assignee, assigneeType: "human"|"agent", priority: "high"|"med"|"low", tag, dueDate? }], participants: string[], remaining }. ` +
      `Free tier: ${DAILY_LIMIT} extractions/day per IP, max ${MAX_INPUT_CHARS.toLocaleString('en-US')} characters per call.`,
    inputSchema: {
      transcript: z
        .string()
        .describe(`Meeting transcript or notes to extract action items from (max ${MAX_INPUT_CHARS.toLocaleString('en-US')} characters).`),
    },
  },
  async ({ transcript }) => extractActionItems(transcript),
)

const transport = new StdioServerTransport()
await server.connect(transport)
