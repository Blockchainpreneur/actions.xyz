// Minimal iCalendar (RFC 5545) VEVENT generator — no external lib needed.
// Used to attach a calendar entry to assignment emails when a task has a deadline.

interface TaskIcsParams {
  uid: string
  title: string
  description?: string
  // ISO date (YYYY-MM-DD) or full ISO datetime — tasks store due_date as a date
  dueDate: string
  url?: string
}

// Escape per RFC 5545 §3.3.11 (TEXT): backslash, semicolon, comma, newline
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// Fold lines longer than 75 octets (RFC 5545 §3.1)
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = []
  let rest = line
  parts.push(rest.slice(0, 75))
  rest = rest.slice(75)
  while (rest.length > 0) {
    parts.push(' ' + rest.slice(0, 74))
    rest = rest.slice(74)
  }
  return parts.join('\r\n')
}

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function toIcsDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

// Returns null when dueDate cannot be parsed. Never throws.
export function buildTaskIcs(params: TaskIcsParams): string | null {
  const due = new Date(params.dueDate)
  if (isNaN(due.getTime())) return null

  // Date-only deadlines (YYYY-MM-DD) become all-day events
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(params.dueDate)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//actions.xyz//task//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeText(params.uid)}@actions.xyz`,
    `DTSTAMP:${toIcsDate(new Date())}`,
  ]

  if (isDateOnly) {
    const next = new Date(due.getTime() + 24 * 60 * 60 * 1000)
    lines.push(`DTSTART;VALUE=DATE:${toIcsDateOnly(due)}`)
    lines.push(`DTEND;VALUE=DATE:${toIcsDateOnly(next)}`)
  } else {
    lines.push(`DTSTART:${toIcsDate(due)}`)
    lines.push(`DTEND:${toIcsDate(new Date(due.getTime() + 30 * 60 * 1000))}`)
  }

  lines.push(`SUMMARY:${escapeText(params.title.slice(0, 200))}`)
  if (params.description) lines.push(`DESCRIPTION:${escapeText(params.description.slice(0, 1000))}`)
  if (params.url) lines.push(`URL:${escapeText(params.url)}`)
  lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Task due', 'TRIGGER:-PT1H', 'END:VALARM')
  lines.push('END:VEVENT', 'END:VCALENDAR')

  return lines.map(foldLine).join('\r\n') + '\r\n'
}
