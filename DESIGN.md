# Design System — actions.xyz

## Product Context
- **What this is:** A real-time meeting action item pipeline that listens to calls, identifies participants, extracts action items, and assigns them to humans or AI agents.
- **Who it's for:** Teams running async or sync meetings who need accountability without manual note-taking.
- **Space/industry:** Productivity, meeting intelligence, async collaboration
- **Project type:** Real-time web app / dashboard

## Aesthetic Direction
- **Direction:** Indie Precision — true black dark / warm cream light
- **Decoration level:** Intentional (ambient glow at top, glass surfaces, accent on live elements only)
- **Mood:** The feeling of a high-quality indie tool built by someone who cares. On dark: pure AMOLED black with electric teal accents that pop. On light: warm parchment paper with deeper teal — like a well-made paper notebook that's also a live data feed.
- **Reference sites:** linear.app (density), arc.net (indie personality), craft.do (warm surfaces)

## Typography
- **Display/Hero:** DM Sans (9–40pt variable) — modern, neutral, high legibility at small sizes
- **Body:** DM Sans — same as display, varies by weight (300 for prose, 400 for body, 500 for labels, 600 for headings)
- **UI/Labels:** DM Sans 500, uppercase + letter-spacing for section labels and status chips
- **Data/Tables:** JetBrains Mono — all timestamps, tags, IDs, transcript text, action extraction output. Signals "live data feed" not "todo list". Supports tabular-nums.
- **Code:** JetBrains Mono
- **Loading:** Google Fonts CDN (DM Sans + JetBrains Mono)
- **Scale:** xs(11px) sm(12px) base(13px) md(14px) lg(15px) xl(20px) 2xl(32px) 3xl(40px)

## Color
- **Approach:** Restrained (teal/cyan accent only, neutrals adapt per theme)
- **Theme system:** `data-theme="dark"` (default) / `data-theme="light"` — toggled via Moon/Sun button in nav, stored in localStorage

### Dark mode
- **Background:** #080808 — real black (AMOLED-ready)
- **Surface-1:** rgba(17,17,17,0.95) — cards, sidebar panels
- **Surface-2:** rgba(26,26,26,0.9) — badges, secondary surfaces
- **Surface-3:** rgba(36,36,36,0.8) — hover states
- **Primary accent (Teal):** #2dd4bf — brighter, vibrant on black
- **Secondary accent (Cyan):** #22d3ee — live indicators, cursor, highlights
- **Border:** rgba(255,255,255,0.07) — primary dividers
- **Border-subtle:** rgba(255,255,255,0.05) — card borders
- **Text-primary:** #efefef — warm off-white, not pure #fff
- **Text-secondary:** #888 — body descriptions
- **Text-muted:** #464646 — timestamps, metadata

### Light mode
- **Background:** #f5f2ed — warm parchment (not sterile white)
- **Surface-1:** rgba(255,255,255,0.88) — cards
- **Surface-2:** rgba(240,235,228,0.9) — secondary surfaces
- **Primary accent (Teal):** #0d9e96 — deeper for warm-bg contrast
- **Secondary accent (Cyan):** #0891b2 — deeper cyan
- **Border:** rgba(0,0,0,0.08)
- **Text-primary:** #1a1a1a — near-black (not full black)
- **Text-secondary:** #666

### Semantic (both modes)
- success: #4ade80 (dark) / #16a34a (light)
- warning: #fbbf24 (dark) / #d97706 (light)
- error: #f87171 (dark) / #dc2626 (light)

## Spacing
- **Base unit:** 4px
- **Density:** Compact (Linear-style — respects user's time)
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(12px) lg(16px) xl(24px) 2xl(32px) 3xl(48px) 4xl(64px)
- **Card padding:** 12px
- **Column gap:** 16px
- **Board padding:** 24px

## Layout
- **Approach:** Grid-disciplined (fixed sidebar + fluid pipeline columns)
- **Sidebar:** 300px fixed width, scrollable transcript feed
- **Pipeline columns:** 280px fixed width each, horizontal scroll
- **Nav:** 57px height, sticky
- **Max content width:** none (board fills viewport)
- **Border radius:** sm(4px) md(6px) card(8px) badge(20px)

## Motion
- **Approach:** Intentional (only animations that communicate state change)
- **Easing:** enter cubic-bezier(0.16,1,0.3,1) (spring) · exit ease-in 100ms · hover linear 150ms
- **Duration:** micro(50ms) short(150ms) medium(250ms) card-entry(400ms)
- **Key animations:**
  - Card entry: opacity 0→1 + translateY(-8px)→0, 400ms spring. Fires when action extracted from transcript.
  - Record pulse: red dot scale + opacity loop, 1.5s ease-in-out infinite
  - Transcript cursor: 1px cyan block, 1s step-end blink
  - Live badge dot: green glow pulse, 1.2s
  - Card hover: translateY(-1px) + border-color teal, 150ms linear

## Differentiators
1. **Human vs AI Agent as a visual primitive.** Teal ⚡ icon for agents, initial-avatar circles for humans. This distinction is first-class in the UI — not a tag or label, but the primary identity signal on every card.
2. **Ocean color palette.** Deep navy + bioluminescent teal/cyan. Every competitor uses blue-gray or purple. This sticks in memory.
3. **JetBrains Mono for all data.** Monospace for transcript, timestamps, and tags telegraphs "live feed" not "another todo app."

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-31 | Ocean palette over blue-gray | Differentiation — every PM tool uses blue-gray or purple |
| 2026-03-31 | JetBrains Mono for data layer | Signals live feed / terminal feel vs todo app |
| 2026-03-31 | Human/Agent visual primitive | No competitor treats this as a first-class design element |
| 2026-03-31 | DM Sans 9–40pt variable | Better x-height and legibility than Inter at 12–13px dense UI |
| 2026-03-31 | Dark-only original | Product is used during active meetings — dark reduces eye strain |
| 2026-04-02 | Real black dark + warm cream light | User requested real black (#080808) + light mode. Ocean navy replaced. Moon/Sun toggle in nav, localStorage-persisted, flash-free via inline script in layout.tsx |
| 2026-03-31 | Web Speech API for transcription | Completely free, browser-native, real-time. Perfect for MVP. |
