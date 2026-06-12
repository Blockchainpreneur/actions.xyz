import { Resend } from 'resend'
import { buildTaskIcs } from '@/lib/ics'

// ─────────────────────────────────────────────────────────────────────────────
// App URL
// In production, NEXTAUTH_URL points to the Vercel domain.
// (Fixed operator-precedence bug: previously `A || B ? X : Y` could yield
// "https://undefined" when NEXTAUTH_URL was set but VERCEL_URL was not.)
// ─────────────────────────────────────────────────────────────────────────────
export const APP_URL =
  process.env.NEXTAUTH_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://actionsxyz.vercel.app')

const FROM = 'actions.xyz <notifications@actionsxyz.vercel.app>'

// ─────────────────────────────────────────────────────────────────────────────
// EmailSender — injectable transport.
// Production: Resend (RESEND_API_KEY). Fallback: logged no-op so every flow
// keeps working without email env. Swap implementations without touching
// callers (e.g. an SMTP sender later).
// ─────────────────────────────────────────────────────────────────────────────
export interface EmailAttachment {
  filename: string
  content: string // utf-8 text content
  contentType?: string
}

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: EmailAttachment[]
}

export interface SendResult {
  ok: boolean
  skipped?: boolean
  error?: string
}

export interface EmailSender {
  send(message: EmailMessage): Promise<SendResult>
}

class ResendEmailSender implements EmailSender {
  private client: Resend
  constructor(apiKey: string) {
    this.client = new Resend(apiKey)
  }
  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const { error } = await this.client.emails.send({
        from: FROM,
        to: message.to,
        subject: message.subject.slice(0, 200),
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map(a => ({
          filename: a.filename,
          content: Buffer.from(a.content, 'utf8'),
          contentType: a.contentType,
        })),
      })
      if (error) return { ok: false, error: error.message }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }
}

class NoopEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<SendResult> {
    console.log(`[email] RESEND_API_KEY not set — skipping "${message.subject}" to ${message.to}`)
    return { ok: false, skipped: true }
  }
}

let _sender: EmailSender | null = null
export function getEmailSender(): EmailSender {
  if (!_sender) {
    const key = process.env.RESEND_API_KEY
    _sender = key ? new ResendEmailSender(key) : new NoopEmailSender()
  }
  return _sender
}

// Test seam — inject a fake transport
export function setEmailSender(sender: EmailSender | null) {
  _sender = sender
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

// Escape HTML to prevent XSS in email templates
export function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Basic email format check
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

function utm(source: string, campaign: string): string {
  return `utm_source=${source}&utm_medium=email&utm_campaign=${campaign}`
}

// Dark-safe palette: warm-light card on every client; explicit colors on every
// element so dark-mode clients that invert backgrounds keep text readable.
const C = {
  bg: '#f0ece4',
  card: '#ffffff',
  border: '#e3ded4',
  text: '#1a1a1a',
  secondary: '#605850',
  muted: '#888078',
  teal: '#0e9188',
  tealDark: '#0d7a72',
}

function bulletproofButton(href: string, label: string, variant: 'primary' | 'secondary'): string {
  const bg = variant === 'primary' ? C.teal : C.card
  const color = variant === 'primary' ? '#ffffff' : C.tealDark
  const border = variant === 'primary' ? C.tealDark : C.border
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="display:inline-table;">
    <tr><td bgcolor="${bg}" style="border-radius:8px;border:1px solid ${border};mso-padding-alt:11px 22px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:11px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:${color};text-decoration:none;border-radius:8px;">${label}</a>
    </td></tr></table>`
}

// Instrumented viral footer — the assignee who is NOT a user is the
// acquisition channel. Every email carries this CTA with attribution.
function viralFooter(token: string, source: string): string {
  const createUrl = `${APP_URL}/auth/signin?ref=${encodeURIComponent(token)}&${utm(source, 'viral_footer')}`
  return `<tr><td style="padding:24px 32px;border-top:1px solid ${C.border};" bgcolor="${C.bg}">
    <p style="margin:0 0 6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${C.secondary};">
      <strong style="color:${C.text};">actions<span style="color:${C.teal};">.xyz</span></strong>
      &nbsp;—&nbsp;turn your meetings into boards like this one.
    </p>
    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;">
      <a href="${createUrl}" target="_blank" style="color:${C.tealDark};font-weight:600;text-decoration:none;">Create yours free &rarr;</a>
    </p>
  </td></tr>`
}

function emailShell(preheader: string, bodyRows: string, footerRow: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="margin:0;padding:0;background-color:${C.bg};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(preheader)}</div>
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${C.bg}">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:520px;border-radius:12px;overflow:hidden;border:1px solid ${C.border};" bgcolor="${C.card}">
        ${bodyRows}
        ${footerRow}
      </table>
      <p style="margin:16px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:${C.muted};">
        Sent by actions.xyz &middot; meeting action pipeline
      </p>
    </td></tr>
  </table>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignment email — "[Name] assigned you: [task]"
// ─────────────────────────────────────────────────────────────────────────────
export interface AssignmentEmailParams {
  to: string
  assignerName: string
  taskText: string
  taskDescription: string
  meetingName: string
  // Signed token for /t/[token]; when null (no signing secret) buttons fall
  // back to the sign-in flow so the email still works.
  token: string | null
  dueDate?: string | null
}

export function buildAssignmentEmail(params: AssignmentEmailParams): EmailMessage {
  const assignerName = esc(params.assignerName)
  const taskText = esc(params.taskText)
  const taskDescription = esc(params.taskDescription)
  const meetingName = esc(params.meetingName)
  const token = params.token

  const taskUrl = token
    ? `${APP_URL}/t/${encodeURIComponent(token)}?${utm('assignment_email', 'task_assignment')}`
    : `${APP_URL}/auth/signin?callbackUrl=${encodeURIComponent('/dashboard')}`
  const doneUrl = token
    ? `${APP_URL}/t/${encodeURIComponent(token)}/done?${utm('assignment_email', 'one_click_done')}`
    : taskUrl

  const dueLine = params.dueDate
    ? `<p style="margin:10px 0 0 0;font-family:'SF Mono',SFMono-Regular,Consolas,Menlo,monospace;font-size:12px;color:${C.secondary};">Due ${esc(formatDueDate(params.dueDate))} &middot; calendar invite attached</p>`
    : ''

  const bodyRows = `
    <tr><td style="padding:28px 32px 0 32px;" bgcolor="${C.card}">
      <p style="margin:0;font-family:'SF Mono',SFMono-Regular,Consolas,Menlo,monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.teal};">New task for you</p>
    </td></tr>
    <tr><td style="padding:12px 32px 0 32px;" bgcolor="${C.card}">
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${C.secondary};">
        <strong style="color:${C.text};">${assignerName}</strong> assigned you a task from <strong style="color:${C.text};">${meetingName}</strong>:
      </p>
    </td></tr>
    <tr><td style="padding:16px 32px 0 32px;" bgcolor="${C.card}">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr><td style="border-left:3px solid ${C.teal};border-radius:4px;padding:14px 16px;" bgcolor="${C.bg}">
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;line-height:1.4;color:${C.text};">${taskText}</p>
          ${taskDescription ? `<p style="margin:8px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${C.secondary};">${taskDescription}</p>` : ''}
          ${dueLine}
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:22px 32px 8px 32px;" bgcolor="${C.card}">
      ${bulletproofButton(taskUrl, 'View &amp; complete task', 'primary')}
      <span style="display:inline-block;width:8px;">&nbsp;</span>
      ${bulletproofButton(doneUrl, 'Mark as done', 'secondary')}
    </td></tr>
    <tr><td style="padding:0 32px 26px 32px;" bgcolor="${C.card}">
      <p style="margin:12px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${C.muted};">
        No account needed — you can view, comment, hand off, or complete this task from the link.
      </p>
    </td></tr>`

  const attachments: EmailAttachment[] = []
  if (params.dueDate && token) {
    const ics = buildTaskIcs({
      uid: token.slice(0, 32),
      title: params.taskText,
      description: params.taskDescription || undefined,
      dueDate: params.dueDate,
      url: `${APP_URL}/t/${encodeURIComponent(token)}`,
    })
    if (ics) attachments.push({ filename: 'task-deadline.ics', content: ics, contentType: 'text/calendar; method=PUBLISH' })
  }

  return {
    to: params.to,
    subject: `${params.assignerName} assigned you: ${params.taskText}`.slice(0, 200),
    html: emailShell(
      `${params.assignerName} assigned you a task from ${params.meetingName}`,
      bodyRows,
      viralFooter(token ?? '', 'assignment_email'),
    ),
    text: [
      `${params.assignerName} assigned you a task from ${params.meetingName}:`,
      '',
      params.taskText,
      params.taskDescription || '',
      '',
      `View & complete: ${taskUrl}`,
      `Mark as done: ${doneUrl}`,
      '',
      'actions.xyz — turn your meetings into boards like this one. Create yours free:',
      `${APP_URL}/auth/signin?ref=${encodeURIComponent(token ?? '')}&${utm('assignment_email', 'viral_footer')}`,
    ].join('\n'),
    attachments: attachments.length ? attachments : undefined,
  }
}

function formatDueDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export async function sendTaskAssignmentEmail(params: AssignmentEmailParams): Promise<SendResult> {
  return getEmailSender().send(buildAssignmentEmail(params))
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly digest — "You have N open tasks from your meetings"
// ─────────────────────────────────────────────────────────────────────────────
export interface DigestTask {
  text: string
  meetingName: string
  dueDate?: string | null
  token: string
}

export function buildDigestEmail(to: string, tasks: DigestTask[]): EmailMessage {
  const n = tasks.length
  const rows = tasks
    .slice(0, 10)
    .map(t => {
      const url = `${APP_URL}/t/${encodeURIComponent(t.token)}?${utm('weekly_digest', 'open_tasks')}`
      return `<tr><td style="padding:10px 14px;border-bottom:1px solid ${C.border};" bgcolor="${C.card}">
        <a href="${url}" target="_blank" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:${C.tealDark};text-decoration:none;">${esc(t.text)}</a>
        <p style="margin:3px 0 0 0;font-family:'SF Mono',SFMono-Regular,Consolas,Menlo,monospace;font-size:11px;color:${C.muted};">${esc(t.meetingName)}${t.dueDate ? ` &middot; due ${esc(formatDueDate(t.dueDate))}` : ''}</p>
      </td></tr>`
    })
    .join('')

  const more = n > 10
    ? `<tr><td style="padding:10px 14px;" bgcolor="${C.card}"><p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:${C.muted};">+ ${n - 10} more open tasks</p></td></tr>`
    : ''

  const bodyRows = `
    <tr><td style="padding:28px 32px 0 32px;" bgcolor="${C.card}">
      <p style="margin:0;font-family:'SF Mono',SFMono-Regular,Consolas,Menlo,monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.teal};">Weekly digest</p>
      <p style="margin:12px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:18px;font-weight:600;color:${C.text};">You have ${n} open task${n === 1 ? '' : 's'} from your meetings</p>
    </td></tr>
    <tr><td style="padding:16px 32px 26px 32px;" bgcolor="${C.card}">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-radius:8px;overflow:hidden;">
        ${rows}
        ${more}
      </table>
    </td></tr>`

  return {
    to,
    subject: `You have ${n} open task${n === 1 ? '' : 's'} from your meetings`,
    html: emailShell(
      `${n} open task${n === 1 ? '' : 's'} are waiting for you`,
      bodyRows,
      viralFooter(tasks[0]?.token ?? '', 'weekly_digest'),
    ),
    text: [
      `You have ${n} open task${n === 1 ? '' : 's'} from your meetings:`,
      '',
      ...tasks.slice(0, 10).map(t => `- ${t.text} (${t.meetingName}): ${APP_URL}/t/${encodeURIComponent(t.token)}`),
      '',
      'actions.xyz — turn your meetings into boards like this one. Create yours free →',
    ].join('\n'),
  }
}
