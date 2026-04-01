import type { Browser, Page } from 'playwright'
import type { CalendarMeeting } from './calendar'

export type BotStatus = 'launching' | 'joining' | 'admitted' | 'recording' | 'stopped' | 'error'

export interface BotInstance {
  meetingId: string
  meetUrl: string
  title: string
  status: BotStatus
  startedAt: number
  error?: string
}

// Module-level singleton — survives across API route invocations in next dev
const bots = new Map<string, BotInstance & { browser?: Browser; page?: Page }>()

// Build the audio capture script injected into the Meet page
function buildAudioScript(meetingId: string, serverOrigin: string): string {
  return `
(function() {
  if (window.__actionsXyzInjected) return;
  window.__actionsXyzInjected = true;

  const MEETING_ID = ${JSON.stringify(meetingId)};
  const UPLOAD_URL = ${JSON.stringify(serverOrigin + '/api/bot/audio?meetingId=' + meetingId)};
  const CHUNK_MS = 5000;

  let recorders = new Set();

  function startCapture(stream, label) {
    if (!stream || stream.getAudioTracks().length === 0) return;

    const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus']
      .find(t => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) || '';

    const opts = mimeType ? { mimeType } : {};
    let recorder;
    try { recorder = new MediaRecorder(stream, opts); } catch { return; }

    let chunks = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = async () => {
      const collected = chunks.splice(0);
      if (collected.length === 0) return;
      const blob = new Blob(collected, { type: recorder.mimeType || 'audio/webm' });
      if (blob.size < 500) return;
      const ext = recorder.mimeType.includes('ogg') ? 'ogg' : 'webm';
      const form = new FormData();
      form.append('audio', new File([blob], 'chunk.' + ext, { type: recorder.mimeType }));
      try { await fetch(UPLOAD_URL, { method: 'POST', body: form }); } catch {}
      if (window.__actionsXyzRecording && recorder.state === 'inactive') {
        recorder.start();
      }
    };

    window.__actionsXyzRecording = true;
    recorder.start();
    recorders.add(recorder);

    setInterval(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, CHUNK_MS);
  }

  // Hook WebRTC peer connections to capture remote audio
  const OrigRTCPeerConnection = window.RTCPeerConnection;
  window.RTCPeerConnection = function(...args) {
    const pc = new OrigRTCPeerConnection(...args);
    pc.addEventListener('track', (e) => {
      if (e.track.kind !== 'audio') return;
      const stream = e.streams[0] || new MediaStream([e.track]);
      startCapture(stream, 'rtc-track');
    });
    return pc;
  };
  Object.assign(window.RTCPeerConnection, OrigRTCPeerConnection);

  // Also hook AudioContext as backup for any audio elements
  const OrigAudioContext = window.AudioContext || window.webkitAudioContext;
  if (OrigAudioContext) {
    const CtxProxy = function(...args) {
      const ctx = new OrigAudioContext(...args);
      const origCreateSource = ctx.createMediaStreamSource.bind(ctx);
      ctx.createMediaStreamSource = function(stream) {
        const source = origCreateSource(stream);
        try {
          const dest = ctx.createMediaStreamDestination();
          source.connect(dest);
          startCapture(dest.stream, 'audio-ctx');
        } catch {}
        return source;
      };
      return ctx;
    };
    window.AudioContext = CtxProxy;
    if (window.webkitAudioContext) window.webkitAudioContext = CtxProxy;
  }

  console.log('[actions.xyz] audio capture injected for meeting ' + MEETING_ID);
})();
`
}

export async function launchBot(meeting: CalendarMeeting): Promise<void> {
  if (bots.has(meeting.id)) return // already running

  const instance: BotInstance & { browser?: Browser; page?: Page } = {
    meetingId: meeting.id,
    meetUrl: meeting.meetUrl,
    title: meeting.title,
    status: 'launching',
    startedAt: Date.now(),
  }
  bots.set(meeting.id, instance)

  // Dynamic import so playwright isn't bundled for edge runtime
  const { chromium } = await import('playwright')

  try {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--auto-accept-camera-and-microphone-capture',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--autoplay-policy=no-user-gesture-required',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    })

    const context = await browser.newContext({
      permissions: ['microphone', 'camera', 'notifications'],
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    })

    const page = await context.newPage()
    instance.browser = browser
    instance.page = page
    instance.status = 'joining'

    const serverOrigin = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

    // Inject audio capture script before any navigation
    await page.addInitScript(buildAudioScript(meeting.id, serverOrigin))

    await page.goto(meeting.meetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })

    // Wait for the name input field on the "Join as guest" screen
    const nameSelectors = [
      'input[aria-label*="name" i]',
      'input[placeholder*="name" i]',
      'input[data-initial-value]',
      '[jsname="YPqjbf"]',
    ]

    let nameInput = null
    for (const sel of nameSelectors) {
      try {
        nameInput = await page.waitForSelector(sel, { timeout: 8000 })
        if (nameInput) break
      } catch {}
    }

    if (nameInput) {
      await nameInput.fill('⚡ actions.xyz')
    }

    // Click the Join/Ask to Join button
    const joinSelectors = [
      'button[jsname="Qx7uuf"]',
      '[data-idom-class="nCP5yc AjY5Oe DuMIQc LQeN7 SP2WId"]',
      'button:has-text("Ask to join")',
      'button:has-text("Join")',
      'button:has-text("Join now")',
    ]

    for (const sel of joinSelectors) {
      try {
        const btn = await page.$(sel)
        if (btn) {
          await btn.click()
          break
        }
      } catch {}
    }

    instance.status = 'admitted'

    // Wait a bit then inject the audio capture script explicitly
    await page.waitForTimeout(3000)
    await page.evaluate(buildAudioScript(meeting.id, serverOrigin))

    instance.status = 'recording'
  } catch (err) {
    instance.status = 'error'
    instance.error = err instanceof Error ? err.message : String(err)
    console.error(`[bot] launch failed for ${meeting.id}:`, err)
    // Clean up browser if launched
    if (instance.browser) {
      try { await instance.browser.close() } catch {}
    }
  }
}

export async function stopBot(meetingId: string): Promise<void> {
  const instance = bots.get(meetingId)
  if (!instance) return

  try {
    if (instance.page) {
      // Signal the page to stop recording
      await instance.page.evaluate(() => { (window as unknown as Record<string, unknown>).__actionsXyzRecording = false }).catch(() => {})
    }
    if (instance.browser) {
      await instance.browser.close()
    }
  } catch {}

  instance.status = 'stopped'
  bots.delete(meetingId)
}

export function getBotStatus(meetingId: string): BotInstance | undefined {
  const b = bots.get(meetingId)
  if (!b) return undefined
  return {
    meetingId: b.meetingId,
    meetUrl: b.meetUrl,
    title: b.title,
    status: b.status,
    startedAt: b.startedAt,
    error: b.error,
  }
}

export function getActiveBots(): BotInstance[] {
  return Array.from(bots.values()).map(b => ({
    meetingId: b.meetingId,
    meetUrl: b.meetUrl,
    title: b.title,
    status: b.status,
    startedAt: b.startedAt,
    error: b.error,
  }))
}
