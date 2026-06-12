# actions-xyz-mcp

MCP server for [actions.xyz](https://actionsxyz.vercel.app) — give any MCP-capable agent (Claude, Cursor, Windsurf, …) the ability to extract structured action items from meeting transcripts and notes.

It exposes **one tool**, `extract_action_items`, backed by the same extraction pipeline that powers the actions.xyz product (also available as a [free web tool](https://actionsxyz.vercel.app/tools/action-item-extractor)) — not a separate toy prompt.

## What it does

```
extract_action_items({ transcript: string })
```

Sends your transcript to the public actions.xyz extraction API (`POST /api/tools/extract`) and returns:

1. **A human-readable summary** — numbered action items with priority, assignee, and due date.
2. **Structured JSON**:

```json
{
  "actions": [
    {
      "task": "Ship the MCP server package",
      "description": "CONTEXT: ...\nSTEPS:\n1. ...",
      "assignee": "Luis",
      "assigneeType": "human",
      "priority": "high",
      "tag": "engineering",
      "dueDate": "Friday"
    }
  ],
  "participants": ["Luis", "Ana"],
  "remaining": 9
}
```

`assigneeType` is `"human"` or `"agent"`, `priority` is `"high" | "med" | "low"`, and `remaining` is your free-tier quota left today.

## Quick start

Requires Node.js ≥ 18. No API key needed.

```bash
npx actions-xyz-mcp
```

The server speaks MCP over stdio — it is meant to be launched by your MCP client, not run by hand.

## Install in your client

### Claude Code

```bash
claude mcp add actions-xyz -- npx actions-xyz-mcp
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "actions-xyz": {
      "command": "npx",
      "args": ["actions-xyz-mcp"]
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in your project):

```json
{
  "mcpServers": {
    "actions-xyz": {
      "command": "npx",
      "args": ["actions-xyz-mcp"]
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "actions-xyz": {
      "command": "npx",
      "args": ["actions-xyz-mcp"]
    }
  }
}
```

## Rate limits (free tier)

The public endpoint is free and unauthenticated, with honest limits:

| Limit | Value |
|---|---|
| Extractions per day | **10 per IP** (resets 24 h after first use) |
| Max transcript size | **20,000 characters** per call |

When you hit the daily limit the tool returns a clear error with the retry window. Need more? [Sign up free at actions.xyz](https://actionsxyz.vercel.app) for 5 full meetings a month.

## Error handling

The tool maps every API error to a message the calling agent can act on:

| Condition | What the tool tells the agent |
|---|---|
| Empty transcript | Asks for actual transcript text (caught locally, no quota burned) |
| Transcript > 20k chars | Says to split into chunks (caught locally, no quota burned) |
| `429 rate_limited` | Daily limit reached + when to retry (`Retry-After`) |
| `503 extraction_unavailable` | Service temporarily down — retry later, input is fine |
| `500 extraction_failed` | Transient server failure — retry once |
| Network failure / timeout | Endpoint unreachable + how to point at another deployment |

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `ACTIONS_XYZ_BASE_URL` | `https://actionsxyz.vercel.app` | Base URL of the actions.xyz deployment to call (useful for self-hosted or local instances) |

## Development

```bash
cd packages/mcp
npm install
npm run build   # tsc → dist/
npm test        # real stdio handshake + live tools/call smoke test
```

## Built by an autonomous agent

This package was designed, built, and tested end-to-end by an autonomous coding agent as part of the actions.xyz build. Every step is on the public record: [actions.xyz build log](https://actionsxyz.vercel.app/buildlog).

## Links

- [actions.xyz](https://actionsxyz.vercel.app) — the product
- [Free action-item extractor](https://actionsxyz.vercel.app/tools/action-item-extractor) — same pipeline, in the browser
- [Build log](https://actionsxyz.vercel.app/buildlog) — the autonomous engine's public ledger
- [Model Context Protocol](https://modelcontextprotocol.io)

## License

[MIT](./LICENSE)
