# 4EverFootball — Monetisation UI Brief

**Repo:** 4ever.buildspecs.io
**Owner:** David
**Companion to:** `MONETISATION_BUILD_BRIEF.md` (the backend spec — read it first for what each feature does and why)
**Status:** backend is built and working. This brief covers the web UI for it.

---

## 0. The one rule that governs everything here

**This app already has a working UI with a visual identity. You are extending it, not redesigning it.**

A user moving from an existing page to a new monetisation page must not be able to tell they were built at different times, by different hands, months apart. If someone can point at a screen and say "that one looks like the new bit," the work has failed regardless of how good the new bit looks on its own.

Three consequences, and they are hard rules:

1. **You do not invent design tokens.** No new colour, no new font, no new type scale step, no new border radius, no new shadow, no new spacing value. Everything you build is assembled from values that already exist in this codebase. If you genuinely need something that does not exist, stop and ask me — do not add it and mention it later.
2. **You do not modify existing shared components.** If a button, card, table or modal already exists, use it as-is. If it does not do what you need, compose a new component *out of* existing primitives and put it in a new folder. Never edit a shared component to suit a new screen — that is how a redesign happens by accident.
3. **You do not touch existing pages** except for two additive insertions listed in §6. No "while I was in there" refactors, no tidying, no reformatting.

If any instruction later in this document conflicts with these three, these three win.

---

## 1. Phase 0 — Design system audit (do this first, then stop)

**Do not write a single feature screen until this is done and I have confirmed it.**

I am not going to describe the design system to you, because you can read it and I would get it wrong from memory.

### 1.1 Find the source of truth

Locate and read whatever actually governs the look of this app. Depending on the stack that could be a Tailwind config, a theme file, CSS custom properties, a component library, SCSS variables, a design-tokens file, or some combination. Report which it is and where it lives.

### 1.2 Capture the current app visually

Take screenshots of at least eight existing pages — including the busiest and most data-dense ones — at **375px, 768px and 1440px** widths. Include at least one page in each state the app supports (logged out, logged in, dark mode if it exists). Save them under `docs/ui-reference/` and commit them. These are your reference, and mine.

### 1.3 Write the inventory

Produce `MONETISATION_UI_INVENTORY.md` containing the **actual values** in use, not descriptions of them:

- **Colour** — every token, with hex and its semantic name. Which is the primary action colour? Which conveys success, warning, danger? What are the surface and border colours? Is there a dark mode, and how is it switched?
- **Type** — font families, the full size scale, weights, line heights. Which size is a page title, a section heading, body, caption?
- **Spacing** — the scale in use, and the standard page padding at each breakpoint.
- **Radius, borders, shadows, elevation** — every value in use.
- **Breakpoints** — the actual values, and whether the app is mobile-first.
- **Components that already exist** — an inventory with file paths: buttons (and their variants), inputs, selects, checkboxes, cards, tables, tabs, modals, drawers, toasts, badges, avatars, empty states, spinners, skeletons, pagination. For each: does it exist, where, what props.
- **Layout shells** — how does an authenticated page get its navigation and chrome? What is the container width? Is there a sidebar, a top bar, a mobile tab bar?
- **Navigation** — how are routes registered, how does the nav know what to show, how is the active state handled?
- **Icons** — which library, at what sizes, in what weights.
- **Forms** — what handles form state and validation today? How are field errors displayed? What is the standard submit-button loading state?
- **Data fetching** — what pattern? How are loading, error and empty states handled today?
- **Tables and lists** — how is a data-heavy list presented on desktop versus mobile? Does it become cards, does it scroll horizontally, does it truncate?
- **Money and numbers** — is there any existing number or currency formatting? Are tabular numerals used anywhere?

### 1.4 Report the gaps

List every component the monetisation UI will need that **does not exist yet** — for example: a stepper, a price/tier selector, a payment status pill, an offline indicator, a receipt view. For each, propose how to compose it from existing primitives, and show me the proposed markup. **Do not build them yet.**

### 1.5 Then stop

Post the inventory and the gap list. I will confirm before you build anything.

---

## 2. The pilot screen — prove the match before building twenty screens

After I approve the inventory, build **exactly one screen**: the **club squad registration page** (§5, Phase B). It is a good pilot because it has a form, a list, money, a payment action and several states — it exercises most of the system.

Then:

1. Screenshot it at 375px, 768px and 1440px.
2. Put those screenshots **side by side** with the closest existing page from `docs/ui-reference/`.
3. Post both sets and tell me honestly where they differ — spacing rhythm, heading weight, button height, border colour, anything.
4. **Stop and wait for my approval.**

Only after I approve the pilot do you build the remaining screens. If the pilot needs three rounds of correction, that is three rounds well spent — every subsequent screen inherits the fix.

---

## 3. Where new code lives

- New pages go in new routes, alongside the existing ones. Follow whatever routing convention the app already uses.
- New components go in a dedicated folder — `components/monetisation/` or whatever matches the existing structure — so the new surface area is obvious and reviewable in isolation.
- New components **import** existing primitives. They never fork or copy them.
- If you find yourself copy-pasting styles out of an existing component, stop: that means the existing component should have been imported, or a shared primitive is genuinely missing and I need to know.

---

## 4. Rules that apply to every screen you build

### 4.1 Money

- One `<Money>` component (or the equivalent for this stack). Every naira figure on every screen goes through it. No exceptions, no inline formatting.
- Backend stores integer **kobo**. The UI **never** shows kobo and never shows a raw integer.
- Format as `₦450,000`. Show decimals only when the amount is not a whole naira.
- Use **tabular numerals** for any column of figures so they align vertically.
- Right-align money in tables. Left-align everything else.
- Never show a total that is still loading as `₦0` — show a skeleton. A flash of zero on a payment screen frightens people.

### 4.2 Every screen needs four states

Loading, empty, error and populated. Build all four. Use the app's existing patterns for each — if it uses skeletons, use skeletons; if spinners, spinners.

Empty states carry the primary action, not just a message. "No competitions yet" is a dead end; "No competitions yet — Create your first competition" is a funnel.

### 4.3 Payment states — the one people get wrong

Every payment surface must handle **six** states, not three:

| State | What the user sees |
|---|---|
| Idle | The amount, the method choice, the pay button |
| Processing | Button disabled with a spinner, form locked |
| **Awaiting confirmation** | "We've received your payment and are confirming it. This usually takes a few seconds." |
| Confirmed | Success, receipt, and what happens next |
| Failed | Plain-English reason and a retry that does not lose their data |
| Expired / abandoned | The link or session timed out, with a clear restart |

**The "awaiting confirmation" state is not optional.** Entitlement is granted by the Paystack webhook, not by the browser redirect — so there is a real window where the user is back on your site and the system does not yet know they paid. If that window shows "unpaid," they will pay twice and you will spend a matchday issuing refunds.

Also: after any successful payment, the success screen must be **safe to reload**. Never trigger anything on mount that could double-charge or double-provision.

### 4.4 Offline and sync states

Anywhere the recorder or a club user might be offline:

- Connection state is **permanently visible**, never hidden in a menu: `Online · synced` / `Offline · 12 events queued` / `Syncing…` / `Sync failed · retry`.
- Offline must never block the user. The recorder keeps working; the queue drains later.
- **Never show a blocking modal in the recorder.** A dialogue over the capture screen during a match is a product failure — a goal goes in while the referee's assistant is dismissing your dialogue. Use inline banners and toasts only.

### 4.5 Mobile first, genuinely

Most club secretaries, recorders and academy coaches will use this on a mid-range Android phone on mobile data, sometimes on a pitch in sunlight.

- Design every screen at **375px first**, then widen. Not the other way round.
- Touch targets **44px minimum**. The recorder's goal and card buttons should be considerably larger — they are pressed in a hurry.
- Data tables become **stacked cards** below the app's mobile breakpoint, following whatever pattern the app already uses. Never a horizontally scrolling table on mobile for anything a user has to act on.
- Keep the new JavaScript weight modest and lazy-load anything heavy. If the app has a performance budget, respect it; if it does not, tell me what these screens add.
- Test contrast — these screens get used outdoors.

### 4.6 Accessibility

Match or beat what the app already does. Labelled inputs, visible focus states, semantic headings, keyboard-operable dialogs, and status changes announced to screen readers. Never communicate a payment or verification state by colour alone — pair every status colour with an icon and a word.

### 4.7 Copy

Write UI copy in the same voice the app already uses — check the existing strings before you write new ones. Plain English. Nigerian context: "bank transfer" not "wire", naira not dollars, "club" and "squad" not "team roster".

Error messages say what happened and what to do next. "Payment failed" is useless. "Your bank declined the transfer. Try again, or pay by bank transfer instead." is useful.

---

## 5. The screens, by phase

Build in this order — it follows the order money actually moves through a competition. Each phase is a branch and a review.

### Phase A — Organiser onboarding and competition licensing

**A1 · Organisation setup.** Create or join an organisation: name, type (organiser / academy / school league / federation), contact details, RC number. Members list with roles (owner, admin, recorder, viewer) and an invite flow.

**A2 · Competition creation wizard.** A stepper — use the app's existing step or tab pattern if one exists, otherwise compose one. Steps: basics (name, format, age groups, season dates) → expected team count → **tier recommendation** → venues → review.

The tier step is the commercial moment. Show the four tiers as cards with team bands and price. Pre-select the tier matching their entered team count and say why: *"Based on 34 teams, League tier."* Show what each tier unlocks. Do not hide the higher tiers — let them see what they are not buying.

**A3 · Licence checkout.** Line items (licence + onboarding fee), the total, payment method choice (card / bank transfer / USSD), and the 50/50 schedule shown explicitly so there is no surprise about the second instalment. Choosing bank transfer shows the account details, the reference to quote, and an "I've sent it" action that puts the invoice into *awaiting confirmation*.

**A4 · Competition dashboard.** The organiser's home for one competition. Licence status, registration progress (teams confirmed / pending / not started), players registered and paid, upcoming fixtures, and outstanding money. This is the screen they will open most — make it the most useful one in the product.

### Phase B — Club registration and the payment gate

*This is where the money is. Build it best.*

**B1 · Public registration landing** — `/register/:competitionSlug`. No login. Competition branding, dates, what registration costs, what a club needs to hand (player names, DOBs, photos), and one clear start button. This page is shared in WhatsApp groups, so its link preview matters: give it a proper title, description and image.

**B2 · Club account creation.** Phone or email, minimal fields. A club secretary on a phone should be through this in under a minute.

**B3 · Squad builder.** The most-used screen in the product. A player list with add, edit and remove. Per player: name, date of birth, position, photo, and guardian consent for anyone under 18.

- Photo capture must work from a phone camera directly, with client-side compression before upload.
- Save continuously. Never lose a squad because a form was not submitted — a secretary entering 20 players will get interrupted.
- Show a live running cost as players are added: *"18 players · ₦18,000"*. Never let the total be a surprise at checkout.
- Validate ages against the competition's age group inline, at entry, not at submit.
- Show a completeness indicator per player so gaps are obvious at a glance.

**B4 · Squad review and payment.** The full squad, the total, and payment. Support **partial payment** — a club can pay for 15 of 20 players and only those 15 become eligible. Make that consequence explicit on screen, because it decides who can play.

**B5 · Squad status.** Post-payment. Which players are confirmed, which are pending, what is still owed, and a shareable link. Clubs will screenshot this and send it to their organiser — design it to be screenshotted.

**B6 · Organiser registration console.** Every club, their squad state, who has paid, who has not. Bulk reminder actions. A manual override for the club that paid cash at the venue — which must capture a reason and show that the record is marked as an override, because it is logged.

### Phase C — Recorder console and public verification

**C1 · Recorder fixture list.** Assigned fixtures, cached for offline. Clear indication of what is available offline versus what still needs a connection.

**C2 · Match capture console.** The screen that decides whether you keep the customer.

- Two squads, large tap targets, minimal chrome.
- Primary actions immediately reachable: goal, card, substitution, period control.
- Running score and match clock always visible.
- Every capture confirms instantly from the local queue — never wait on the network to acknowledge a tap.
- An event feed the recorder can scan to spot a mistake.
- Corrections are a deliberate, slightly slower flow requiring a reason — they are a new record, not an edit, and the UI should make that legible rather than hiding it.
- Persistent sync indicator with a queued count and a manual sync control.

**C3 · Verified record badge — public match page.** A small badge on the existing public match page. Tapping it opens a panel: event count, verification status, when it was verified, and the recorder identity. Plain English: *"Every event in this match was recorded live and cannot be edited. Verified 12 August 2026."*

This is a **sales feature**. An organiser will click it during your demo. Give it the polish of a marketing page, not a debug endpoint — and keep the insertion into the existing page purely additive.

### Phase D — Billing

**D1 · Organiser billing centre.** Invoices with status, downloadable PDFs, payment history, receipts, what is due and when. Nothing clever — clarity only. People check this when they are anxious about money.

**D2 · Internal revenue admin (yours only).** Cash collected, outstanding, by competition and by organisation. Payments needing reconciliation. Webhook log with signature-validity status. Manual "mark paid by transfer" with reference and proof upload.

This one is behind a role gate and can be plainer than the customer-facing screens — but it must be genuinely usable, because you will be in it every week.

### Phase E — Sponsor

**E1 · Sponsor dashboard.** Link-access, read-only, sponsor-branded. Headline figures — teams, players, matches played and verified, communities reached, minutes of football, reach. A sponsor will open this on a phone and screenshot it for their manager. Design for that.

**E2 · Impact report view and download.** The report on screen plus PDF and dataset downloads. Every number carries its verification status. Anything estimated is visibly labelled as an estimate with its basis shown — that honesty is the product.

**E3 · Sponsor branding slot on public competition pages.** Additive only. A defined slot that renders sponsor logos when configured and renders nothing at all when not. Zero visual change to competitions without a sponsor.

### Phase F — Academy workspace

**F1 · Academy dashboard.** Roster size, age groups, attendance this week, plan status.

**F2 · Roster and age groups.** Player list, filters, bulk actions, per-player detail.

**F3 · Attendance.** Four taps per player, works offline, same sync pattern as match capture. Coaches use this at the pitch side in a hurry.

**F4 · Development reports.** Generate per term, preview, export PDF, share to a parent by link. The share flow should assume WhatsApp.

**F5 · Academy plan and billing.** Band, renewal date, annual prepay discount, invoices.

### Phase G — Media library

**G1 · Competition media library.** Every auto-generated graphic, filterable by club, match and type. Bulk download. Per-club download so a club admin gets only theirs.

**G2 · Player passport.** Public, shareable, one-tap share sized for WhatsApp status and Instagram stories. This is the acquisition loop — it must look genuinely good, load fast, and share cleanly. Get the link preview metadata right.

---

## 6. The only permitted changes to existing pages

Exactly two, both purely additive:

1. **Verified record badge** on the public match page (C3).
2. **Sponsor branding slot** on public competition pages (E3) — renders nothing when unconfigured.

Everything else is a new route. If you believe a third change to an existing page is necessary, stop and ask.

**Prove you did not break anything:** before starting, screenshot the reference pages (§1.2). After each phase, re-screenshot the same pages at the same widths and diff them. Any unintended visual change is a bug to fix, not a change to justify. If the project has visual regression tooling, use it; if not, a manual before/after comparison in the phase report is fine.

---

## 7. Explicitly forbidden

- Adding a UI library, component kit or CSS framework that is not already in the project
- Adding an icon set that is not already in use
- Adding a font
- Introducing a new colour, radius, shadow, spacing value or type-scale step
- Changing global CSS, theme files or Tailwind config
- Editing shared components to suit a new screen
- Refactoring, renaming or reformatting anything you were not asked to change
- A dashboard chart library, unless the app already has one — plain numbers and simple bars are enough for everything in this brief
- Animations beyond what the app already does
- `localStorage` for anything that belongs on the server
- Any AI-flavoured feature

---

## 8. How to work through this

1. **Phase 0** — design system audit and inventory. Stop and report.
2. **Pilot screen** (B3, the squad builder). Screenshots side by side with an existing page. Stop and wait for approval.
3. Then one lettered phase at a time, on its own branch. Before each: restate the screens as a checklist and confirm.
4. After each phase, post: screenshots at all three widths, the before/after diff of the reference pages, and anything you had to deviate on and why.
5. Keep a running `MONETISATION_UI_PROGRESS.md`.

**If a screen in this brief cannot be built cleanly from the existing design system, say so before building it rather than inventing your way around it.** A screen that quietly introduces a new visual language is worse than a screen that waits a day for a decision.
