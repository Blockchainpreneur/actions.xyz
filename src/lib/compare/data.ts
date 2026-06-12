// Compare-page data — single source of truth for /compare/[slug].
// Every competitor claim below is grounded in verified research (June 2026:
// live pricing pages + official help-center docs). Where the research could
// not verify something, the copy says so explicitly ("we found no documented
// way to…") instead of asserting absence. Do NOT add claims here without a
// primary source.

export type CellStatus = 'yes' | 'no' | 'partial' | 'none'

export interface TableCell {
  text: string
  status: CellStatus
}

export type RowKey =
  | 'recording'
  | 'install'
  | 'kanban'
  | 'emailAssign'
  | 'freeTier'
  | 'pricing'

export interface CompareRowDef {
  key: RowKey
  label: string
  us: TableCell
}

export interface Faq {
  q: string
  a: string
}

export interface CompetitorData {
  slug: string
  /** Full display name, e.g. "Otter.ai" */
  name: string
  /** Short name for prose, e.g. "Otter" */
  shortName: string
  /** Official pricing page, linked from the page for transparency */
  pricingUrl: string
  /** One-line description of what they are (neutral, accurate) */
  whatItIs: string
  /** Honest verdict shown above the fold */
  verdict: {
    summary: string
    chooseThem: string[]
    chooseUs: string[]
  }
  /** Competitor cells for the comparison table (rows defined in COMPARE_ROWS) */
  cells: Record<RowKey, TableCell>
  /** "The workflow gap" section — short paragraphs, competitor-specific */
  workflowGap: string[]
  faqs: Faq[]
  meta: {
    title: string
    description: string
  }
}

// ── actions.xyz column (same on every page) ──────────────────────────────
export const COMPARE_ROWS: CompareRowDef[] = [
  {
    key: 'recording',
    label: 'How it records',
    us: { text: 'In your browser tab — no bot has to join the call', status: 'yes' },
  },
  {
    key: 'install',
    label: 'Install required',
    us: { text: 'None — zero install, works on any OS', status: 'yes' },
  },
  {
    key: 'kanban',
    label: 'Action items → kanban board',
    us: { text: 'Native kanban pipeline, built in', status: 'yes' },
  },
  {
    key: 'emailAssign',
    label: 'Assign tasks by email to non-users',
    us: { text: 'Yes — assignees never need an account', status: 'yes' },
  },
  {
    key: 'freeTier',
    label: 'Free plan',
    us: { text: '5 meetings/mo — renews every month, data stays yours', status: 'yes' },
  },
  {
    key: 'pricing',
    label: 'Paid from (per user/mo)',
    us: { text: '$15 annual · $19 monthly', status: 'none' },
  },
]

export const VERIFIED_DATE = 'June 2026'

// Shared honest framing used in workflow-gap copy
const GAP_CORE =
  'Transcription is table stakes in 2026 — every tool on this page does it. The gap is what happens after the call: a summary nobody re-opens, or a pipeline that actually moves. actions.xyz turns each commitment into a card on a kanban board and lets you assign it to anyone by email — even people who have never signed up — so the meeting ends with work in motion, not a document.'

export const COMPETITORS: CompetitorData[] = [
  // ── 1. Otter.ai ─────────────────────────────────────────────────────────
  {
    slug: 'otter',
    name: 'Otter.ai',
    shortName: 'Otter',
    pricingUrl: 'https://otter.ai/pricing',
    whatItIs:
      'Otter.ai is one of the most mature AI meeting transcription tools, with 10+ years of speech-recognition work, mobile and desktop apps, and a generous free transcription allowance.',
    verdict: {
      summary:
        'Choose Otter if raw transcription volume and maturity matter most — 300 free minutes a month, real-time transcripts, mobile apps, and in-person capture are genuinely strong. Choose actions.xyz if you want meetings to end in an executed task pipeline instead of a transcript, without a bot joining your calls.',
      chooseThem: [
        'You need lots of free transcription volume (300 min/mo vs our 5 meetings/mo)',
        'You record in person or on mobile — Otter has native apps, we are browser-based',
        'You want a decade-mature ASR engine and enterprise surface (SSO, HIPAA, API)',
        'Price is the deciding factor — Otter Pro is $8.33/user/mo on annual billing',
      ],
      chooseUs: [
        'No bot ever needs to join your call — Otter’s default motion is OtterPilot joining as a visible participant',
        'Action items land on a native kanban board, not a flat list',
        'Assign a task to anyone by email — not limited to meeting participants',
        'Zero install: Otter’s bot-free recording needs its Chrome extension (Meet only) or desktop app',
      ],
    },
    cells: {
      recording: {
        text: 'Bot by default — OtterPilot joins Zoom/Meet/Teams as a visible participant. Bot-free modes exist but are an opt-out path',
        status: 'partial',
      },
      install: {
        text: 'Bot-free capture requires the Chrome extension (Google Meet only) or the Mac/Windows desktop app',
        status: 'partial',
      },
      kanban: {
        text: 'No — "My Action Items" is a flat cross-meeting list',
        status: 'no',
      },
      emailAssign: {
        text: 'Auto-assigns to meeting participants only; we found no documented way to assign tasks to someone without an Otter account',
        status: 'no',
      },
      freeTier: {
        text: '300 transcription min/mo, 30 min cap per conversation, 3 file imports for the lifetime of the account',
        status: 'partial',
      },
      pricing: { text: '$8.33 annual · $16.99 monthly (Pro)', status: 'none' },
    },
    workflowGap: [
      'Otter extracts action items well — "My Action Items" auto-assigns them to meeting participants and collects them in a cross-meeting list. But the list is flat, assignment stops at people who were in the meeting, and pushing work onward means wiring up Asana or Zapier, where the assignee needs that tool’s account too.',
      GAP_CORE,
    ],
    faqs: [
      {
        q: 'Does Otter.ai send a bot into meetings?',
        a: 'By default, yes — OtterPilot (the "Otter AI Notetaker") joins Zoom, Google Meet, and Teams calls as a visible participant via calendar sync. Otter does offer bot-free recording through its Chrome extension (Google Meet only) and desktop apps, but the default motion is calendar auto-join. actions.xyz records in your browser tab, so nothing joins the call at all.',
      },
      {
        q: 'Can Otter assign action items to people outside the meeting?',
        a: 'Otter auto-assigns action items to meeting participants. We found no documented way to assign an Otter action item to someone without an Otter account. actions.xyz lets you assign any task to any email address — the assignee gets a task page by email and never needs to sign up.',
      },
      {
        q: 'Is Otter.ai cheaper than actions.xyz?',
        a: 'Yes, on entry price: Otter Pro is $8.33/user/mo billed annually ($16.99 monthly), versus $15/mo annual ($19 monthly) for actions.xyz Starter. Otter wins on transcription volume per dollar; actions.xyz is priced on the workflow — extraction into a kanban pipeline with email assignment built in.',
      },
      {
        q: 'What does Otter’s free plan include?',
        a: 'Otter Basic includes 300 transcription minutes per month with a 30-minute cap per conversation, and 3 file imports for the lifetime of the account. The actions.xyz free plan is 5 full meetings per month — fewer minutes, but each meeting runs the complete pipeline (transcription, extraction, kanban, email assignment) and the allowance renews every month.',
      },
      {
        q: 'When is Otter the better choice?',
        a: 'When you need high transcription volume, real-time transcripts during the call, mobile or in-person recording, or enterprise requirements like SSO and HIPAA. Otter has a decade of ASR maturity that a younger product honestly cannot match yet.',
      },
    ],
    meta: {
      title: 'actions.xyz vs Otter.ai (2026) — botless action items, compared honestly',
      description:
        'Otter.ai vs actions.xyz, compared honestly: bot vs in-browser recording, flat action-item lists vs a native kanban, participants-only vs assign-anyone-by-email, and real free-tier terms. Verified June 2026.',
    },
  },

  // ── 2. Fireflies.ai ─────────────────────────────────────────────────────
  {
    slug: 'fireflies',
    name: 'Fireflies.ai',
    shortName: 'Fireflies',
    pricingUrl: 'https://fireflies.ai/pricing',
    whatItIs:
      'Fireflies.ai is a meeting-intelligence platform known for its "Fred" notetaker bot, 100+ language support, and a very large integration catalog.',
    verdict: {
      summary:
        'Choose Fireflies if you need broad language coverage, a huge integration catalog, and high free transcription volume. Choose actions.xyz if you want action items to become assigned, tracked tasks in-product — without a bot in the call and without AI-credit metering.',
      chooseThem: [
        'You work across many languages — Fireflies supports 100+',
        'You need its integration catalog or API across Zoom/Meet/Teams and dozens of tools',
        'Free transcription volume matters: Fireflies advertises unlimited transcription (with 400 min of storage per team)',
        'Entry price: Fireflies Pro is $10/seat/mo on annual billing',
      ],
      chooseUs: [
        'Nothing joins your call — Fireflies’ default is the "Fred" bot via calendar auto-join',
        'Native kanban + email assignment vs push-to-Asana/Trello where assignees need that tool’s account',
        'No AI-credit metering — Fireflies gates AI features behind monthly credits (20 on Pro, 30 on Business)',
        'Zero install: Fireflies’ bot-free capture needs its Chrome extension (Meet, audio-only) or desktop app; video recording is still bot-only',
      ],
    },
    cells: {
      recording: {
        text: 'Bot by default — "Fred" joins via calendar auto-join. Bot-free: Chrome extension (Meet, audio-only) or desktop app since Nov 2025; video capture is still bot-only',
        status: 'partial',
      },
      install: {
        text: 'Bot-free capture requires the Chrome extension or the Mac/Windows desktop app',
        status: 'partial',
      },
      kanban: {
        text: 'No — action items live in summaries and are pushed out to Asana/Trello/Monday',
        status: 'no',
      },
      emailAssign: {
        text: 'No native assignment — tasks are exported to project tools, where the assignee must be a member of that tool',
        status: 'no',
      },
      freeTier: {
        text: '"Unlimited transcription" with 400 min of storage per team — older meetings get pushed out',
        status: 'partial',
      },
      pricing: { text: '$10 annual · $18 monthly (Pro), plus AI-credit limits', status: 'none' },
    },
    workflowGap: [
      'Fireflies extracts action items into its summaries, but there is no native task board and no native assignment: the model is push-to-Asana, push-to-Trello, push-to-Monday — and in each case the person receiving the task needs an account in that destination tool. AI features are also metered by monthly credits on paid plans.',
      GAP_CORE,
    ],
    faqs: [
      {
        q: 'Does Fireflies.ai use a bot to record meetings?',
        a: 'By default, yes — the Fireflies notetaker ("Fred", fred@fireflies.ai) joins meetings via calendar auto-join. Fireflies added bot-free options: a Chrome extension for Google Meet (audio-only) and a desktop app for Mac/Windows (Nov 2025), but video recording still requires the bot. actions.xyz records in your browser tab with nothing to install and no participant added to the call.',
      },
      {
        q: 'Can Fireflies assign action items to people directly?',
        a: 'Not natively. Fireflies pushes action items to project-management tools like Asana, Trello, or Monday — and the assignee must be a member of that tool. actions.xyz assigns tasks to any email address in-product; the recipient gets a task page without creating an account anywhere.',
      },
      {
        q: 'What are Fireflies AI credits?',
        a: 'Fireflies meters its AI features with monthly credits on paid plans — 20 on Pro, 30 on Business, 50 on Enterprise, per its official pricing page. actions.xyz has no credit system: plan limits are stated in meetings, and every meeting runs the full extraction pipeline.',
      },
      {
        q: 'Is Fireflies cheaper than actions.xyz?',
        a: 'On entry price, yes: Fireflies Pro is $10/seat/mo billed annually versus $15/mo annual for actions.xyz Starter. Factor in what you’re buying, though — Fireflies prices transcription with credit-gated AI; actions.xyz prices the complete meeting-to-pipeline workflow.',
      },
      {
        q: 'When is Fireflies the better choice?',
        a: 'When you need 100+ language support, its large integration catalog and API, or maximum free transcription volume. If your workflow already lives in Asana or Trello and everyone has accounts there, Fireflies’ push-out model may be enough.',
      },
    ],
    meta: {
      title: 'actions.xyz vs Fireflies.ai (2026) — no bot, no credits, tasks that ship',
      description:
        'Fireflies.ai vs actions.xyz: the Fred bot vs in-browser recording, AI-credit metering vs flat plans, push-to-Asana vs a native kanban with email assignment to non-users. Verified June 2026.',
    },
  },

  // ── 3. Fathom ───────────────────────────────────────────────────────────
  {
    slug: 'fathom',
    name: 'Fathom',
    shortName: 'Fathom',
    pricingUrl: 'https://www.fathom.ai/pricing',
    whatItIs:
      'Fathom is a highly rated AI notetaker (around 6,500 G2 reviews at 5.0/5) with unlimited free recording and transcription, strong CRM integrations, and SOC 2 Type II / HIPAA compliance.',
    verdict: {
      summary:
        'Choose Fathom if you want unlimited free recording and deep CRM workflows — its review record is outstanding. Choose actions.xyz if your priority is action items that become an assigned pipeline (Fathom’s free AI action items cap at 5 calls/month, and assignment happens in Asana, not in Fathom).',
      chooseThem: [
        'Unlimited free recordings, transcription (38 languages), and storage — a genuinely strong free offer',
        'You run sales calls on HubSpot/Salesforce — Fathom syncs CRM fields and has deal views',
        'You weight social proof and compliance: ~6.5K G2 reviews at 5.0, SOC 2 Type II, HIPAA',
        'Entry price: Fathom Team is $15/user/mo annual (2-user minimum)',
      ],
      chooseUs: [
        'No bot on Zoom or Teams calls — Fathom’s bot-free capture is a Mac beta per its own pricing page',
        'AI action items on every free meeting in your plan — Fathom’s free advanced AI caps at 5 calls/month',
        'Native kanban and email assignment — Fathom assigns owners in Asana, not in-product',
        'No forced account linking — since March 2026 Fathom requires connecting your Zoom account for Zoom joins',
      ],
    },
    cells: {
      recording: {
        text: 'Bot capture on Zoom/Teams; markets "bot-free" capture, which its pricing page lists as a Mac beta',
        status: 'partial',
      },
      install: {
        text: 'Desktop app for bot-free Mac beta; Zoom joins require connecting your Zoom account (since Mar 2026)',
        status: 'partial',
      },
      kanban: {
        text: 'No — action items are a per-meeting list, pushed to Asana or Zapier',
        status: 'no',
      },
      emailAssign: {
        text: 'No — owner assignment happens in the destination tool (e.g. Asana), which requires an account there',
        status: 'no',
      },
      freeTier: {
        text: 'Unlimited recordings/transcription/storage — but advanced AI (action items, templates, Ask Fathom) is limited to 5 calls/month',
        status: 'partial',
      },
      pricing: { text: '$15 annual (Team, 2-user min) · $19 monthly; Premium $16 annual / $20 monthly', status: 'none' },
    },
    workflowGap: [
      'Fathom’s free plan is honestly excellent for recording — unlimited recordings, transcription, and storage. The precision point: advanced AI, including action items, is limited to 5 calls per month on the free plan. So for the action-item workflow specifically, Fathom free and actions.xyz free are the same size — and Fathom’s action items end as a list you push to Asana, where owners and accounts live.',
      GAP_CORE,
    ],
    faqs: [
      {
        q: 'Is Fathom really bot-free?',
        a: 'Partially. Fathom markets a choice of bot and bot-free capture, but its own pricing page lists bot-free capture as a Mac beta. On Zoom and Teams, capture uses a visible participant, and since March 2026 all users must connect their Zoom account for Zoom joins. actions.xyz records in the browser on any OS with nothing joining the call.',
      },
      {
        q: 'Does Fathom’s free plan include action items?',
        a: 'Yes, but capped: advanced AI features — action items, summary templates, Ask Fathom — are limited to 5 calls per month on the free plan, even though recording and transcription are unlimited. The actions.xyz free plan is also 5 meetings/month, and every one runs the full extraction-to-kanban pipeline.',
      },
      {
        q: 'Can Fathom assign action items to someone by email?',
        a: 'Fathom’s model is to push action items to Asana (or via Zapier), where you assign owners — meaning the assignee needs an Asana account. actions.xyz assigns tasks to any email address directly; recipients get a task page with no signup.',
      },
      {
        q: 'Is Fathom cheaper than actions.xyz?',
        a: 'Slightly, at entry: Fathom Team is $15/user/mo annual with a 2-user minimum, and Premium is $16/user/mo annual. actions.xyz Starter is $15/mo annual with no seat minimum. The real difference is what the money buys: CRM depth (Fathom) vs an executed task pipeline (actions.xyz).',
      },
      {
        q: 'When is Fathom the better choice?',
        a: 'When you record a high volume of calls and mostly need transcripts and summaries, when your team runs on HubSpot/Salesforce, or when SOC 2 / HIPAA compliance and a long review record are requirements. Fathom’s ~6.5K G2 reviews at 5.0/5 are real social proof we don’t have yet.',
      },
    ],
    meta: {
      title: 'actions.xyz vs Fathom (2026) — the 5-AI-calls fine print, compared honestly',
      description:
        'Fathom vs actions.xyz: unlimited free recording vs a full action-item pipeline, the 5-AI-calls/month free cap, Mac-beta bot-free capture, and assignment in Asana vs by email to anyone. Verified June 2026.',
    },
  },

  // ── 4. tl;dv ────────────────────────────────────────────────────────────
  {
    slug: 'tldv',
    name: 'tl;dv',
    shortName: 'tl;dv',
    pricingUrl: 'https://tldv.io/app/pricing/',
    whatItIs:
      'tl;dv is an AI meeting recorder with strong multi-meeting AI reports, 30+ languages, and thousands of integrations — popular with teams that want scheduled AI digests across all their calls.',
    verdict: {
      summary:
        'Choose tl;dv if you want AI reports that query across all your meetings — that feature is genuinely differentiated. Choose actions.xyz if you care about free-plan honesty (tl;dv’s free AI limits are lifetime, not monthly, and free recordings auto-delete after 3 months) and want tasks assigned, not just noted.',
      chooseThem: [
        'Multi-Meeting AI Reports — query and digest across all meetings; actions.xyz has no equivalent',
        'You need 30+ languages or its 5,000+ integrations including native Salesforce/HubSpot (Business tier)',
        'You want clip/highlight tooling for sharing meeting moments',
      ],
      chooseUs: [
        'A free plan that renews monthly — tl;dv’s free AI limits are for the lifetime of the account (first 10 meetings full AI notes, then only the first 10 minutes of each)',
        'Your recordings stay yours — tl;dv free recordings are archived after 3 days and deleted after 3 months',
        'No bot waiting to be admitted — Google Meet now flags the tl;dv Notetaker as a "potential risk"',
        'No auto-emails to your meeting participants — a widely reported tl;dv complaint',
      ],
    },
    cells: {
      recording: {
        text: 'Bot by default — the "tl;dv Notetaker" must be admitted from the waiting room; Google Meet flags it as a potential risk. A desktop app added bot-free local capture in 2026',
        status: 'partial',
      },
      install: {
        text: 'Bot-free capture requires the desktop app',
        status: 'partial',
      },
      kanban: {
        text: 'No — action items can tag teammates, then push out via reports to Slack/Notion/Asana/Trello/Zapier',
        status: 'no',
      },
      emailAssign: {
        text: 'No — you can tag teammates with a link to the moment, but we found no documented way to assign a task to a non-user',
        status: 'no',
      },
      freeTier: {
        text: 'Full AI notes for the first 10 meetings ever, then only the first 10 minutes of each; limits are lifetime, not monthly; recordings deleted after 3 months',
        status: 'no',
      },
      pricing: { text: '~$18 annual · ~$29 monthly (Pro, per independent trackers — verify on their pricing page)', status: 'none' },
    },
    workflowGap: [
      'tl;dv extracts action items and lets you tag teammates with a timestamped link, but tasks leave the product through reports and Zapier — there is no board and no way we could find to hand a task to someone outside the tool. And the free plan deserves a careful read: by tl;dv’s own help center, free AI limits "are for the lifetime of the account, they do not renew monthly", and free recordings are deleted after 3 months.',
      GAP_CORE,
    ],
    faqs: [
      {
        q: 'Is tl;dv’s free plan really unlimited?',
        a: 'Recordings are unlimited, but the AI is not: per tl;dv’s official help center, the free plan includes full AI notes for your first 10 meetings, then AI notes cover only the first 10 minutes of each meeting — and these limits are for the lifetime of the account, not monthly. Free recordings are also archived after 3 days and auto-deleted after 3 months. The actions.xyz free plan is 5 meetings every month, renewing monthly.',
      },
      {
        q: 'Does tl;dv use a meeting bot?',
        a: 'Yes — the tl;dv Notetaker joins as a participant and must be admitted from the waiting room; Google Meet now labels it a "potential risk" on join. tl;dv shipped a desktop app with bot-free local capture in 2026, but that requires an install. actions.xyz records in the browser with no bot and nothing to install.',
      },
      {
        q: 'Can tl;dv assign action items to people without accounts?',
        a: 'We found no documented way. tl;dv lets you tag teammates (email/Slack link to a timestamped moment) and push items to Asana, Trello, Notion, or 6,000+ Zapier apps — where the assignee needs that tool. actions.xyz assigns tasks to any email address natively.',
      },
      {
        q: 'How much does tl;dv cost?',
        a: 'Per independent pricing trackers (tl;dv’s pricing page requires JavaScript, so verify there): Pro is around $18/user/mo annual ($29 monthly) and Business around $59/user/mo annual ($98 monthly). actions.xyz runs $15–63/mo annual across Starter, Pro, and Team — with no jump like tl;dv’s Pro-to-Business cliff.',
      },
      {
        q: 'When is tl;dv the better choice?',
        a: 'When you want Multi-Meeting AI Reports — scheduled AI digests that query across every meeting you’ve recorded. That is a genuinely differentiated feature actions.xyz doesn’t have. Its language coverage and integration catalog are also much larger.',
      },
    ],
    meta: {
      title: 'actions.xyz vs tl;dv (2026) — lifetime free caps vs a free plan that renews',
      description:
        'tl;dv vs actions.xyz: lifetime free AI limits and 3-month auto-delete vs a monthly-renewing free plan, waiting-room bots vs in-browser recording, and tagging vs real task assignment. Verified June 2026.',
    },
  },

  // ── 5. Grain ────────────────────────────────────────────────────────────
  {
    slug: 'grain',
    name: 'Grain',
    shortName: 'Grain',
    pricingUrl: 'https://grain.com/pricing',
    whatItIs:
      'Grain is a meeting recorder oriented toward sales teams, known for video clips, highlights, and stories, plus HubSpot-first CRM workflows and deal boards.',
    verdict: {
      summary:
        'Choose Grain if video clips and sales coaching are your job — its highlight/story tooling has no equivalent here. Choose actions.xyz if you want botless capture on any OS and action items that become an assigned pipeline rather than entries pushed to your CRM.',
      chooseThem: [
        'Video clips, highlights, and stories — Grain’s signature feature, nothing comparable in actions.xyz',
        'Sales workflows: deal boards, coaching, HubSpot/Salesforce integration',
        'Free recording volume (per Grain’s support docs: unlimited recordings with a 45-min cap each — though its pricing page shows 20 meetings, so check current terms)',
        'Entry price: Starter around $15/seat/mo annual',
      ],
      chooseUs: [
        'Botless on every OS — Grain’s bot-free Desktop Capture is macOS-only and English-only; its default is the "Grain Notetaker" bot announcing itself',
        'Native task kanban — Grain’s board is a sales deal board, not a task pipeline',
        'Assign by email to anyone — we found no non-user assignment anywhere in Grain’s docs',
        'No downgrade lockout — Grain users report losing access to their own recordings after downgrading',
      ],
    },
    cells: {
      recording: {
        text: 'Bot by default — "Grain Notetaker has joined the meeting" on Zoom/Meet/Teams/Webex. Bot-free Desktop Capture (Oct 2025) is macOS-only and English-only',
        status: 'partial',
      },
      install: {
        text: 'Bot-free capture requires the macOS desktop app (English-only)',
        status: 'partial',
      },
      kanban: {
        text: 'No task kanban — its board is a sales Deal board (Business tier); action items push out to Slack/Asana/HubSpot/Salesforce',
        status: 'no',
      },
      emailAssign: {
        text: 'No — detects owners from context, but we found no documented way to assign a task to a non-user by email',
        status: 'no',
      },
      freeTier: {
        text: 'Support docs say unlimited recordings with a 45-min cap each; the pricing page shows 20 meetings — sources conflict, check current terms',
        status: 'partial',
      },
      pricing: { text: '~$15 annual · $19 monthly (Starter)', status: 'none' },
    },
    workflowGap: [
      'Grain detects action items and even infers owners and due dates from context — on the free plan too, which is genuinely good. But there is no task board: Grain’s "board" is a sales deal board on the Business tier, and items leave through Slack, Asana, or your CRM. The person doing the work needs an account in whichever tool the task lands in.',
      GAP_CORE,
    ],
    faqs: [
      {
        q: 'Does Grain use a meeting bot?',
        a: 'By default, yes — participants see "Grain Notetaker has joined the meeting" on Zoom, Meet, Teams, and Webex. Grain shipped bot-free Desktop Capture in October 2025, but it is macOS-only and English-only. actions.xyz records in the browser on any OS, in the page you’re already in, with nothing joining the call.',
      },
      {
        q: 'Does Grain have a kanban board for tasks?',
        a: 'No. Grain has a deal board for sales pipelines on its Business tier, which is a different thing — it tracks deals, not action items. Grain’s action items push out to Slack, Asana, HubSpot, or Salesforce. actions.xyz has a native kanban where every extracted action item lands as a card you can move and assign.',
      },
      {
        q: 'What does Grain’s free plan include?',
        a: 'Grain’s own sources conflict as of June 2026: its support docs describe unlimited recordings with a 45-minute cap per recording for free users, while its pricing page displays 20 meetings. Check their current terms before relying on either. The actions.xyz free plan is unambiguous: 5 meetings per month, renewing monthly.',
      },
      {
        q: 'What happens to Grain data if I downgrade?',
        a: 'Grain reviewers report being locked out of their own recordings after downgrading, with no clear published policy. With actions.xyz, the free plan renews monthly and your boards and tasks remain accessible.',
      },
      {
        q: 'When is Grain the better choice?',
        a: 'When video is the artifact you share — clips, highlights, and stories for sales coaching and customer voice — or when your revenue workflow lives in HubSpot. Grain is built for that; actions.xyz is built for the meeting-to-task pipeline.',
      },
    ],
    meta: {
      title: 'actions.xyz vs Grain (2026) — task pipeline vs sales clips, compared honestly',
      description:
        'Grain vs actions.xyz: the Grain Notetaker bot vs in-browser recording, Mac/English-only bot-free capture vs any OS, deal boards vs a native task kanban with email assignment. Verified June 2026.',
    },
  },

  // ── 6. Avoma ────────────────────────────────────────────────────────────
  {
    slug: 'avoma',
    name: 'Avoma',
    shortName: 'Avoma',
    pricingUrl: 'https://www.avoma.com/pricing',
    whatItIs:
      'Avoma is a revenue-intelligence platform for sales orgs — meeting assistant plus scheduler, dialer, conversation intelligence, and CRM sync — with strong reviews (G2 4.6/5, ~1,350 reviews).',
    verdict: {
      summary:
        'Choose Avoma if you are a sales org of 10+ that wants the full revenue stack — scheduler, dialer, conversation and revenue intelligence. Choose actions.xyz if you want a meeting-to-task pipeline with a real free tier, flat pricing, and no bot — Avoma has no free plan and its add-ons can multiply the headline price.',
      chooseThem: [
        'You want the full revenue stack: scheduler, dialer, conversation intelligence, revenue intelligence, lead routing',
        'Bidirectional CRM sync, forecasting, and coaching for sales teams of 10+',
        'Social proof: G2 4.6/5 across ~1,350 reviews and a 97% renewal claim',
      ],
      chooseUs: [
        'A free tier exists at all — Avoma has none (14-day trial only)',
        'Flat, transparent pricing — Avoma’s add-ons (Conversation Intelligence, Revenue Intelligence, Lead Router) can take a $19 seat to roughly $77/mo effective',
        'Truly botless without paid dependencies — Avoma’s "botless" paths rely on paid Zoom Cloud or Google Workspace recording licenses',
        'Native kanban + assignment to any email — Avoma assigns action items to meeting participants',
      ],
    },
    cells: {
      recording: {
        text: 'Bot by default — "Avoma Assistant" joins and announces recording. Botless paths depend on paid Zoom Cloud / Google Workspace native recording',
        status: 'partial',
      },
      install: {
        text: 'No client install for the bot, but botless capture requires a paid Zoom or Workspace plan doing the recording',
        status: 'partial',
      },
      kanban: {
        text: 'No — action items with reminders, exported via Zapier/CRM sync',
        status: 'no',
      },
      emailAssign: {
        text: 'Assigns to meeting participants; we found no documented way to assign to someone without an Avoma account',
        status: 'no',
      },
      freeTier: {
        text: 'None — recording requires a paid seat; 14-day trial only',
        status: 'no',
      },
      pricing: { text: '$19 annual · $29 monthly (Startup) — add-ons of $29–35/seat each can stack on top', status: 'none' },
    },
    workflowGap: [
      'Avoma’s action items are real — extracted, assigned to participants, with reminders. But assignment stops at meeting participants with Avoma accounts, there is no board, and the product’s center of gravity is revenue intelligence: the further your team is from a sales org, the more of Avoma you’re paying for and not using.',
      GAP_CORE,
    ],
    faqs: [
      {
        q: 'Does Avoma have a free plan?',
        a: 'No. Avoma offers a 14-day trial; recording requires a paid Recorder seat (viewers are free). Some 2026 blog posts claim a free Avoma plan, but Avoma’s official pages contradict them. actions.xyz has a free plan of 5 meetings per month that renews monthly.',
      },
      {
        q: 'Is Avoma botless?',
        a: 'Avoma’s default is the "Avoma Assistant" bot, which joins and announces recording. Its bot-free paths import recordings from paid Zoom Cloud or Google Workspace native recording — so botless capture depends on another paid license. actions.xyz records in the browser with no bot and no external recording dependency.',
      },
      {
        q: 'What does Avoma actually cost?',
        a: 'The Startup tier is $19/seat/mo annual ($29 monthly, up to 25 seats). The trap is the add-ons: Conversation Intelligence and Revenue Intelligence run roughly $29–35/seat/mo each, and Lead Router $19–25 — independent analysis puts a fully loaded rep at about $77/seat/mo. actions.xyz pricing is flat: the plan price is the whole price.',
      },
      {
        q: 'Can Avoma assign action items to non-users?',
        a: 'Avoma assigns action items to meeting participants and supports reminders, but we found no documented way to assign a task to someone without an Avoma account. actions.xyz assigns to any email address — the recipient gets a task page, no account needed.',
      },
      {
        q: 'When is Avoma the better choice?',
        a: 'When you are a sales organization that will actually use the stack — scheduler, dialer, conversation intelligence, forecasting, CRM hygiene. For a 10+ seat revenue team, Avoma replacing 3–4 point tools can justify its pricing.',
      },
    ],
    meta: {
      title: 'actions.xyz vs Avoma (2026) — flat pricing and a real free tier vs the revenue stack',
      description:
        'Avoma vs actions.xyz: no free plan and stacking add-ons vs flat pricing with a monthly-renewing free tier, bot-with-announcement vs in-browser recording, participants-only vs email assignment. Verified June 2026.',
    },
  },

  // ── 7. Krisp ────────────────────────────────────────────────────────────
  {
    slug: 'krisp',
    name: 'Krisp',
    shortName: 'Krisp',
    pricingUrl: 'https://krisp.ai/pricing/',
    whatItIs:
      'Krisp is the closest botless rival — an AI meeting assistant built on its renowned noise-cancellation technology, capturing meetings through a desktop app with virtual audio drivers instead of a bot.',
    verdict: {
      summary:
        'Choose Krisp if noise cancellation is the job — it is Krisp’s moat and nothing here compares — or if you need to capture native desktop apps and in-person audio. Choose actions.xyz for botless capture with zero install: no driver, no OS requirement, no app that must stay open, and tasks that land on a board assignable to anyone.',
      chooseThem: [
        'Best-in-class noise cancellation and accent conversion — Krisp’s core technology',
        'Captures native desktop Zoom/Teams apps and in-person audio — a browser recorder cannot',
        'Compliance maturity: SOC 2, GDPR, HIPAA, PCI',
        'Entry price: Core is $8/user/mo annual',
      ],
      chooseUs: [
        'Zero-install botless vs install-a-driver botless — Krisp needs its desktop app with virtual audio devices selected in your call app, Windows/Mac only',
        'No "app must stay open" failure mode and no mic-misconfiguration risk',
        'Kanban + assignment to any email — Krisp’s Centralized Action Items is a list scoped to participants, with no documented external assignment',
        'A clearer free tier: 5 full-pipeline meetings/mo vs 2 AI meeting notes/day with 7-day history',
      ],
    },
    cells: {
      recording: {
        text: 'No bot — verified. But capture works through a desktop app installing virtual audio drivers ("Krisp Microphone/Speaker") you must select inside Zoom/Meet/Teams',
        status: 'partial',
      },
      install: {
        text: 'Desktop app required, Windows/Mac only (no Linux/ChromeOS); the app window must stay open during calls',
        status: 'no',
      },
      kanban: {
        text: 'No — "Centralized Action Items" is a cross-meeting list (assignee, due date, priority, status), not a board',
        status: 'no',
      },
      emailAssign: {
        text: 'Auto-assigns to participants; assignment to non-users by email is not documented anywhere we could find. Exports are TXT-only, integrations via Zapier',
        status: 'no',
      },
      freeTier: {
        text: '2 AI meeting notes/day, 7-day meeting history, 60 min/day noise cancellation, single device',
        status: 'partial',
      },
      pricing: { text: '$8 annual · $16 monthly (Core)', status: 'none' },
    },
    workflowGap: [
      'Krisp deserves credit: it is genuinely botless, and its Centralized Action Items dashboard (assignees, due dates, priorities, status) is deeper than most. The difference is the deployment model and the last mile: Krisp lives in a desktop app with virtual audio drivers — Windows/Mac only, app open at all times, mic correctly selected — and its action items stay a participant-scoped list with TXT exports and Zapier as the way out.',
      GAP_CORE,
    ],
    faqs: [
      {
        q: 'Krisp is also botless — what’s actually different?',
        a: 'The install. Krisp captures audio through a desktop app that installs virtual audio devices ("Krisp Microphone" and "Krisp Speaker") which you must select inside Zoom, Meet, or Teams — Windows and Mac only, with the app window open during calls. actions.xyz records in the browser tab: nothing to install, no driver, works on Linux and ChromeOS too, no misconfigured-mic failure mode.',
      },
      {
        q: 'Does Krisp have action items and task assignment?',
        a: 'Yes — Krisp’s Centralized Action Items dashboard tracks tasks across meetings with assignee, due date, priority, and status, auto-assigned to participants. It is a sectioned list rather than a board, and we found no documented way to assign an item to someone outside Krisp; exports are TXT-only with Zapier for integrations. actions.xyz puts items on a kanban and assigns them to any email.',
      },
      {
        q: 'What does Krisp’s free plan include?',
        a: 'Per Krisp’s help docs and independent reviews: 60 minutes/day of noise cancellation, unlimited transcription, 2 AI meeting notes per day, 7-day meeting history, and a single device. The actions.xyz free plan is 5 meetings per month with the complete pipeline and no history expiry.',
      },
      {
        q: 'Is Krisp cheaper than actions.xyz?',
        a: 'Yes — Krisp Core is $8/user/mo annual ($16 monthly) versus $15/mo annual for actions.xyz Starter. If noise cancellation plus notes is all you need, Krisp is the value pick. actions.xyz charges for the workflow after the notes: board, assignment, follow-through.',
      },
      {
        q: 'When is Krisp the better choice?',
        a: 'When call audio quality is the problem — noisy environments, call centers, accent conversion — or when you need to capture native desktop apps and in-person conversations. That is Krisp’s home turf and a browser-based recorder honestly cannot reach it.',
      },
    ],
    meta: {
      title: 'actions.xyz vs Krisp (2026) — zero-install botless vs install-a-driver botless',
      description:
        'Krisp vs actions.xyz — the two botless approaches compared: browser tab vs desktop app with virtual audio drivers, action-item lists vs a native kanban with email assignment to non-users. Verified June 2026.',
    },
  },

  // ── 8. Sembly ───────────────────────────────────────────────────────────
  {
    slug: 'sembly',
    name: 'Sembly AI',
    shortName: 'Sembly',
    pricingUrl: 'https://www.sembly.ai/pricing/',
    whatItIs:
      'Sembly AI is a meeting assistant with genuinely deep task extraction — names, due dates, assignees inferred from commitments — plus native Asana/Trello automations and routing to 50+ tools.',
    verdict: {
      summary:
        'Choose Sembly if you need a bot that attends meetings without you or rich no-code routing into Asana/Trello. Choose actions.xyz if you want no bot introducing itself on client calls, a free plan that still exists (Sembly discontinued its free tier in March 2026), and tasks assigned in-product to anyone.',
      chooseThem: [
        'Its bot can attend meetings you skip — structurally impossible for an in-browser recorder',
        'Deep no-code routing: native Asana/Trello automations plus 50+ tools with filters',
        'Enterprise surface: HIPAA on Max, audit logs, 35+ languages, large workspaces',
        'Pre-recorded uploads (5–10 hr caps) for processing existing audio',
      ],
      chooseUs: [
        'No bot introducing itself to your clients — Sembly’s agent joins, announces itself, and records',
        'A real, renewing free tier — Sembly discontinued its free Personal plan in March 2026; the replacement trial auto-deletes data older than 4 months',
        'No calendar-disconnect failure mode where the bot silently never joins and the meeting is lost',
        'Native kanban + email assignment vs task sync into Trello/Asana where assignees need accounts',
      ],
    },
    cells: {
      recording: {
        text: 'Bot-based — the Sembly agent joins any call it is invited to, introduces itself, and starts recording; it can attend even when you are absent',
        status: 'no',
      },
      install: {
        text: 'No client install (bot-based); the only bot-free path is uploading pre-recorded files',
        status: 'partial',
      },
      kanban: {
        text: 'No in-app kanban — the board experience is delegated to Trello/Asana via native automations',
        status: 'no',
      },
      emailAssign: {
        text: 'No — assignees are meeting attendees or members of the destination tool; no assignment to arbitrary emails',
        status: 'no',
      },
      freeTier: {
        text: 'Discontinued March 2026 — replaced by a 7-day "Basic free trial" with slow processing and auto-deletion of data older than 4 months',
        status: 'no',
      },
      pricing: { text: '$10 annual · $17 monthly (Basic, single-user) · Pro $20 annual / $29 monthly', status: 'none' },
    },
    workflowGap: [
      'Sembly’s task extraction is genuinely deep — names, descriptions, due dates, assignees inferred from spoken commitments — and its Asana/Trello automations are the best push-out story in this lineup. But that is exactly the model: push out. There is no board inside Sembly, and the person who ends up owning the task needs an account in Trello, Asana, or whichever of the 50+ destinations it routes to.',
      GAP_CORE,
    ],
    faqs: [
      {
        q: 'Does Sembly have a free plan?',
        a: 'Not anymore. Sembly discontinued its free Personal plan in March 2026, replacing it with a "Basic free trial": a 7-day minute/credit quota, slower processing, and unrecoverable auto-deletion of data older than 4 months. actions.xyz keeps a real free plan — 5 meetings per month, renewing every month.',
      },
      {
        q: 'Does Sembly use a meeting bot?',
        a: 'Yes — per Sembly’s own getting-started docs, the Sembly agent joins any call it is invited to, introduces itself, and starts recording. It can even attend meetings when you are absent, which is a real capability actions.xyz cannot match — an in-browser recorder requires you (or a teammate) to be there. The flip side: nothing ever announces itself on your client calls.',
      },
      {
        q: 'Can Sembly assign tasks to people by email?',
        a: 'Sembly infers assignees from commitments and syncs tasks natively into Asana or Trello, where the owner must be a member of that tool. We found no way to assign a Sembly task to an arbitrary email address. actions.xyz does exactly that — assignees get a task page by email, no account required.',
      },
      {
        q: 'How much does Sembly cost?',
        a: 'After its March 2026 restructure: Basic is $10/user/mo annual ($17 monthly) but capped at a single user per workspace; Pro is $20 annual ($29 monthly) up to 40 users; Max is $30 annual ($39 monthly) with a 3-user minimum. actions.xyz Starter is $15/mo annual with no single-user workspace cap and no seat minimums.',
      },
      {
        q: 'When is Sembly the better choice?',
        a: 'When you need coverage of meetings you cannot attend — its bot goes without you — or when your team already lives in Asana/Trello and wants deep no-code routing with filters. Its HIPAA tier and 35+ languages also matter for some orgs.',
      },
    ],
    meta: {
      title: 'actions.xyz vs Sembly AI (2026) — a free plan that exists, no bot on your calls',
      description:
        'Sembly AI vs actions.xyz: the self-introducing bot vs in-browser recording, the discontinued free tier vs a monthly-renewing one, and Trello/Asana sync vs a native kanban with email assignment. Verified June 2026.',
    },
  },
]

export const COMPETITOR_SLUGS = COMPETITORS.map(c => c.slug)

export function getCompetitor(slug: string): CompetitorData | undefined {
  return COMPETITORS.find(c => c.slug === slug)
}
