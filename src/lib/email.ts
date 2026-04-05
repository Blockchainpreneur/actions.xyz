import { Resend } from 'resend'

const APP_URL = process.env.NEXTAUTH_URL || 'https://actionsxyz.vercel.app'

// Lazy init — Resend throws if no API key at construction time
let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

interface TaskEmailParams {
  to: string
  assignerName: string
  taskText: string
  taskDescription: string
  meetingName: string
}

// Escape HTML to prevent XSS in email templates
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Basic email format check
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function sendTaskAssignmentEmail(params: TaskEmailParams) {
  const resend = getResend()
  if (!resend) {
    console.log('[email] RESEND_API_KEY not set, skipping email to', params.to)
    return
  }

  const signInUrl = `${APP_URL}/auth/signin?callbackUrl=${encodeURIComponent('/dashboard')}`

  const assignerName = esc(params.assignerName)
  const taskText = esc(params.taskText)
  const taskDescription = esc(params.taskDescription)
  const meetingName = esc(params.meetingName)

  await resend.emails.send({
    from: 'actions.xyz <notifications@actionsxyz.vercel.app>',
    to: params.to,
    subject: `${params.assignerName} assigned you: ${params.taskText}`.slice(0, 200),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1714;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 13px; font-weight: 500; letter-spacing: 0.04em; color: #808080;">
            actions<span style="color: #0e9188;">.xyz</span>
          </span>
        </div>

        <p style="font-size: 14px; color: #6a6258; margin-bottom: 16px;">
          <strong>${assignerName}</strong> assigned you a task from <strong>${meetingName}</strong>:
        </p>

        <div style="background: #f8f5f0; border-left: 3px solid #0e9188; padding: 16px; border-radius: 4px; margin-bottom: 16px;">
          <p style="font-size: 15px; font-weight: 500; color: #1a1714; margin: 0 0 8px 0;">
            ${taskText}
          </p>
          ${taskDescription ? `
            <p style="font-size: 13px; color: #6a6258; margin: 0; line-height: 1.6;">
              ${taskDescription}
            </p>
          ` : ''}
        </div>

        <a href="${signInUrl}" style="display: inline-block; background: #0e9188; color: white; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
          View Your Tasks
        </a>

        <p style="font-size: 11px; color: #a09890; margin-top: 32px; line-height: 1.6;">
          You received this because ${assignerName} assigned you a task in actions.xyz.
          Sign in with Google to see all your tasks.
        </p>
      </div>
    `,
  })
}
