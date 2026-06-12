#!/usr/bin/env node
// Regenerates src/lib/buildlog-data.json from the two real sources:
// the engine's PROGRESS.log and this repo's git history. The JSON is
// committed, so builds never depend on files outside the repo — if a
// source is missing the script keeps whatever is already checked in.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(repo, 'src/lib/buildlog-data.json')
const progressPath = process.argv[2] ?? join(homedir(), '.auramaxing/billion/actions.xyz/PROGRESS.log')

if (!existsSync(progressPath)) {
  console.log(`[buildlog] ${progressPath} not found — keeping existing JSON`)
  process.exit(0)
}

const TYPE_RE = /\|\s*(CYCLE\d?-?L?\d?|C?\d?-?OBJ-[\d a-z]+|LOOP(?:-TICK)?)\s*\|/i

const entries = readFileSync(progressPath, 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean)
  .map(line => {
    const [date] = line.split(' | ', 1)
    const m = line.match(TYPE_RE)
    const type = m ? m[1].trim().toUpperCase() : 'NOTE'
    const failed = /stall|STALLED|retry/i.test(line)
    const closed = /gate:CLOSED|MERGED/i.test(line)
    return { date: date.trim(), type, text: line.slice(line.indexOf('|') + 1).trim(), failed, closed }
  })

const rawLog = execSync(
  'git log --since=midnight --date=format:%H:%M --pretty=format:%h%x09%ad%x09%s --numstat',
  { cwd: repo },
).toString()

const commits = []
let current = null
let additions = 0
let deletions = 0
for (const line of rawLog.split('\n')) {
  if (line.includes('\t') && /^[0-9a-f]{7,}\t/.test(line)) {
    const [hash, time, msg] = line.split('\t')
    current = { hash, time, msg, add: 0, del: 0 }
    commits.push(current)
  } else if (current && /^\d+\t\d+\t/.test(line)) {
    const [add, del] = line.split('\t')
    current.add += Number(add)
    current.del += Number(del)
    additions += Number(add)
    deletions += Number(del)
  }
}

const e2eCount = Number(
  execSync(`grep -ch "^\\s*test(" e2e/*.spec.ts | awk '{s+=$1} END {print s}'`, { cwd: repo, shell: '/bin/bash' })
    .toString()
    .trim() || 0,
)

const data = {
  generated_at: new Date().toISOString(),
  stats: {
    commits_today: commits.length,
    additions,
    deletions,
    e2e_tests: e2eCount,
    cycles: entries.filter(e => /^CYCLE/.test(e.type)).length,
    gates_closed: entries.filter(e => e.closed).length,
    stalls: entries.filter(e => e.failed).length,
  },
  entries: entries.reverse(),
  commits,
}

writeFileSync(out, JSON.stringify(data, null, 2) + '\n')
console.log(`[buildlog] wrote ${out}: ${entries.length} entries, ${commits.length} commits, ${e2eCount} e2e tests`)
