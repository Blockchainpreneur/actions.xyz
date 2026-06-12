import buildlog from '@/lib/buildlog-data.json'

const SITE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://actions.xyz'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function GET() {
  const items = buildlog.entries
    .map(
      e => `    <item>
      <title>${esc(`${e.type}${e.failed ? ' · FAILURE' : e.closed ? ' · GATE CLOSED' : ''}`)}</title>
      <description>${esc(e.text)}</description>
      <pubDate>${new Date(`${e.date}T12:00:00Z`).toUTCString()}</pubDate>
      <guid isPermaLink="false">${esc(`${e.date}-${e.type}-${e.text.slice(0, 40)}`)}</guid>
    </item>`,
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>actions.xyz build log — a SaaS operated by an AI agent</title>
    <link>${SITE}/buildlog</link>
    <description>Unedited ledger of the autonomous engine building actions.xyz: gates, merges, tournaments, failures.</description>
${items}
  </channel>
</rss>`

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
