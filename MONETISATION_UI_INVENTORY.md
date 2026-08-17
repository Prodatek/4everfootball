# 4EverFootball — Design System Audit (Phase 0)

**Companion to:** `MONETISATION_UI_BRIEF.md`
**Status:** Audit complete. Screenshots captured. No feature code written. Stop here per §1.5 — awaiting confirmation before the pilot screen (§2).

---

## 0. Source of truth

**Tailwind v4, CSS-first config — there is no `tailwind.config.js`/`.ts` anywhere in the repo.** All design tokens live in one file:

- **`apps/web/src/app/globals.css`** — the `@theme inline` block maps semantic token names to CSS custom properties; the `:root` block below it holds the actual values.
- **`apps/web/components.json`** — shadcn/ui config: style `"base-nova"`, base color `neutral`, icon library `lucide`, CSS variables mode on, no prefix. Primitives are generated into `apps/web/src/components/ui/`.
- **`apps/web/src/app/layout.tsx`** — the three Google Fonts are declared and bound to CSS variables here (not in globals.css).

No SCSS, no separate design-tokens JSON, no component-library package. Everything is these two files plus the generated component tree.

The identity is called **"Floodlight"** (see the comment directly above `:root` in globals.css): a single committed dark theme — violet/black/white, stadium-floodlight mood. **There is no light mode and no theme toggle.** The `.dark` variant selector (`@custom-variant dark`) exists because shadcn's codegen always emits it, but nothing in the app ever adds a `.dark` class — confirmed by grep, zero hits for a theme toggle or `next-themes`. So "dark mode, and how is it switched" (brief §1.3) has one honest answer: *it doesn't switch — dark is the only mode.*

---

## 1. Screenshots

36 screenshots captured live against a running instance of the app (real seeded data — 6 teams, a 6-team league competition with one played fixture and three scheduled, 3 players, 1 news article — not empty scaffolding) at **375px, 768px, 1440px**, saved to `docs/ui-reference/`:

| Page | States captured |
|---|---|
| `home` | Logged out |
| `login`, `register` | Logged out |
| `teams` | Logged out, populated list |
| `competition-detail` | Logged out, **the busiest page in the app** — standings table, top scorers, top assists, teams list, fixtures list, all populated |
| `live` | Logged out, populated (scheduled fixtures) |
| `news` | Logged out, populated |
| `fixtures` | Logged out, populated, paginated |
| `dashboard` | Logged in, plain user |
| `admin-dashboard`, `admin-teams`, `admin-users` | Logged in, SUPER_ADMIN, populated admin tables |

No dark/light pair was captured because no such pair exists (see §0). This is 12 pages × 3 widths = 36 images, exceeding the brief's minimum of 8.

---

## 2. Colour

Every token, real hex/oklch value, from `globals.css:58-92`:

| Token | Value | Role |
|---|---|---|
| `--background` | `#0d0812` | Page ground — near-black violet |
| `--foreground` | `#f4eff9` | Primary text |
| `--card` / `--popover` | `#1a1024` | Raised surface |
| `--card-foreground` / `--popover-foreground` | `#f4eff9` | Text on raised surface |
| `--primary` | `#a238ff` | **The** action colour — buttons, links, active states, brand violet |
| `--primary-foreground` | `#ffffff` | Text on primary |
| `--secondary` / `--accent` | `#241531` | Secondary surface (both tokens share this value) |
| `--secondary-foreground` / `--accent-foreground` | `#f4eff9` | Text on secondary/accent |
| `--muted` | `#1f1429` | Muted surface |
| `--muted-foreground` | `#b6a6c8` | De-emphasised text (captions, meta) |
| `--destructive` | `#ff5470` | **Only** semantic status colour defined — errors, delete actions, danger badges |
| `--border` | `rgba(244,239,249,0.12)` | Hairline borders (translucent white on the dark ground) |
| `--input` | `rgba(244,239,249,0.16)` | Input borders |
| `--ring` | `#a238ff` | Focus ring (= primary) |
| `--live` | `#35d07f` | Green — **defined but not wired to any component variant** (see §10 gap) |
| `--chart-1..5` | `#a238ff, #35d07f, #b6a6c8, #ff5470, #4c1780` | Chart palette, unused today (no chart library in the app) |

**Critical finding: there is no `success` or `warning` colour.** Only `destructive` (red/pink `#ff5470`) exists as a semantic status colour. `--live` (green `#35d07f`) exists as a token but is not exposed as a Badge/Button variant anywhere — it's only referenced directly in one-off className strings. A monetisation UI needing paid/pending/overdue or confirmed/failed states has exactly one semantic colour to reuse (`destructive`) and one more token that exists but isn't componentised (`live`, which reads as "success green" and is the obvious candidate to promote to a real variant — see §10).

Sidebar tokens (`--sidebar-*`) exist in `:root` as raw shadcn boilerplate in **oklch**, unused — there is no sidebar component in this codebase that reads them (the actual admin nav rail is hand-built, see §7).

---

## 3. Type

Three font families, declared in `apps/web/src/app/layout.tsx:8-24`, bound as CSS variables and aliased in `globals.css:10-13`:

| CSS variable | Google Font | Weight(s) loaded | Role |
|---|---|---|---|
| `--font-display` (aliased to `--font-heading`) | Big Shoulders | 900 only | Headings, page titles, the wordmark — condensed stadium-signage face |
| `--font-sans` | IBM Plex Sans | 400, 600 | Body text, UI copy |
| `--font-mono` | IBM Plex Mono | 600 only | Scores, clocks, the footer copyright line — tabular/technical content |

**No explicit type-scale tokens exist** — no `--text-*` custom properties in globals.css. The app uses Tailwind v4's built-in default scale (`text-sm`, `text-lg`, `text-2xl`, etc.) directly in component classNames, sized ad hoc per component rather than through a shared scale. Observed in practice:

- Hero heading (`home` page): `text-6xl`/`text-7xl` `font-display`
- Card titles (`CardTitle` in `card.tsx`): `font-heading` (= Big Shoulders), roughly `text-lg`–`text-xl` depending on context
- Body copy: default `text-sm`/`text-base`, `font-sans` (inherited from `html { @apply font-sans }` in globals.css:101-103)
- Captions/meta (fixture dates, muted labels): `text-xs`/`text-sm text-muted-foreground`
- Footer copyright: `font-mono text-xs`

There is no documented "this size = page title, this size = section heading" mapping beyond what's visible in the screenshots — a new screen should match nearby existing screens by eye/inspection rather than a named scale step, because no named scale step exists.

---

## 4. Spacing

No `--spacing-*` custom properties either — Tailwind v4's default 0.25rem (4px) base unit is used as-is throughout (`gap-4`, `p-6`, `space-y-3`, etc., all standard Tailwind steps).

**Standard page padding**: the only container primitive is `Container` (`apps/web/src/components/layout/container.tsx`):

```ts
Container({ size = "md", className, children })
// size="sm" -> max-w-2xl
// size="md" -> max-w-4xl   (default)
// size="lg" -> max-w-6xl
```

Renders `<div className="mx-auto w-full px-4 sm:px-6">`. That `px-4 sm:px-6` **is** the standard page padding at every breakpoint in the app — 16px below the `sm` breakpoint, 24px at and above it, no further steps at `md`/`lg`/`xl`. `size="lg"` (max-w-6xl) is used for the footer; most content pages use `md` or narrower.

---

## 5. Radius, borders, shadows, elevation

**Radius** — one base token, four derived steps, `globals.css:44-50`:

```
--radius: 0.5rem                        (8px)
--radius-sm:  calc(var(--radius) * 0.6)  = 0.3rem  (4.8px)
--radius-md:  calc(var(--radius) * 0.8)  = 0.4rem  (6.4px)
--radius-lg:  var(--radius)              = 0.5rem  (8px)
--radius-xl:  calc(var(--radius) * 1.4)  = 0.7rem  (11.2px)
--radius-2xl: calc(var(--radius) * 1.8)  = 0.9rem  (14.4px)
--radius-3xl: calc(var(--radius) * 2.2)  = 1.1rem  (17.6px)
--radius-4xl: calc(var(--radius) * 2.6)  = 1.3rem  (20.8px)
```
Cards use `rounded-xl`; inputs/buttons use smaller steps. Always reference the Tailwind utility (`rounded-lg`, `rounded-xl`), never a raw rem value.

**Borders** — `--border: rgba(244,239,249,0.12)`, a translucent white over the dark ground, applied globally via `@layer base { * { @apply border-border } }` (globals.css:94-97). `--input` is a slightly stronger `0.16` alpha for form field borders.

**Shadows / elevation** — **no custom shadow tokens exist.** The app uses Tailwind's unthemed default `shadow-md`/`shadow-lg` utilities, and only on floating/overlay surfaces: dropdown menu, select popover, and the mobile nav Sheet (all three always pair the shadow with `ring-1 ring-foreground/10`). **`Card` itself has no shadow at all** — its edge is drawn with `ring-1 ring-foreground/10`, not a shadow. The convention is clear: **ring for resting surfaces (cards), shadow+ring together for floating/overlay surfaces.** A monetisation card should not invent a new shadow — it should use the same ring-only treatment as every other card.

---

## 6. Breakpoints

No `--breakpoint-*` overrides in globals.css — Tailwind v4's defaults are used unmodified: `sm: 40rem (640px)`, `md: 48rem (768px)`, `lg: 64rem (1024px)`, `xl: 80rem (1280px)`, `2xl: 96rem (1536px)`.

In practice only three are ever used: `sm:` (26 call sites), `md:` (9), `lg:` (7) across the whole `src/` tree. **`xl:` and `2xl:` are never used anywhere.** The app is mobile-first in intent (unprefixed classes are the mobile styles, breakpoint prefixes widen from there) but the audit surfaced at least one real gap in that story — see §7.

---

## 7. Layout shells

There is **no shared authenticated-page shell/sidebar component.** Two different, independent patterns exist:

**Public site** — `apps/web/src/components/site-header.tsx` + `site-footer.tsx`, mounted once, globally, in `apps/web/src/app/providers.tsx` (wrapping `{children}` — not per-route-group layout, every single route gets this same header/footer). Topbar only. Nav data from `apps/web/src/lib/nav-links.ts` (flat list, no roles). Mobile nav is the `Sheet` primitive (`side="right"`), triggered by a `Menu` icon button — this is the hamburger visible in **every** `-375.png` screenshot, including the admin ones, because the public header wraps admin pages too.

**Admin site** — `apps/web/src/app/admin/layout.tsx`. Chrome is inlined directly in this one route-layout file, not a reusable component: `<aside className="hidden w-56 shrink-0 border-r p-4 sm:block">`, a role-filtered nav array defined locally (see §8). **Gap: this sidebar has no mobile fallback at all** — `hidden ... sm:block` with no accompanying Sheet/drawer, so below 640px the entire admin nav (Dashboard/Teams/Players/Competitions/Fixtures/News/Media/Users) is unreachable except by typing a URL directly. The hamburger that *is* visible on mobile admin screenshots opens the **public** nav sheet (Live/Teams/Players/Competitions/Fixtures/News) inherited from the global header — it does not contain any admin links. Confirmed both by reading `admin/layout.tsx` and by the captured `admin-users-375.png`/`admin-teams-375.png` screenshots, where the sidebar is simply absent below `sm`.

This matters directly for the brief: any new organiser/academy admin screen inherits this same gap unless deliberately fixed, and the brief's Phase 0 rule against modifying existing pages means that fix (if wanted) needs an explicit decision, not an incidental one.

---

## 8. Navigation

Two **separate**, unrelated nav-registration patterns, not one shared system:

1. **`apps/web/src/lib/nav-links.ts`** — flat, public-only, no roles:
   ```ts
   export const NAV_LINKS = [
     { href: "/live", label: "Live" }, { href: "/teams", label: "Teams" },
     { href: "/players", label: "Players" }, { href: "/competitions", label: "Competitions" },
     { href: "/fixtures", label: "Fixtures" }, { href: "/news", label: "News" },
   ] as const;
   ```
   Consumed identically by both `site-header.tsx` and `site-footer.tsx`. No active-link highlighting on the public header (`Link` styling is static, doesn't check `usePathname()`).

2. **A second, parallel array inlined in `apps/web/src/app/admin/layout.tsx`**, role-filtered:
   ```ts
   const NAV_LINKS: { href: string; label: string; roles: Role[] }[] = [
     { href: "/admin", label: "Dashboard", roles: ["ADMIN", "SUPER_ADMIN"] },
     { href: "/admin/scouting", label: "Live Scouting", roles: ["SCOUT", "ADMIN", "SUPER_ADMIN"] },
     // ...teams/players/competitions/fixtures: ["ADMIN","SUPER_ADMIN"]
     { href: "/admin/news", label: "News", roles: ["ADMIN", "SUPER_ADMIN", "EDITOR"] },
     { href: "/admin/media", label: "Media", roles: ["ADMIN", "SUPER_ADMIN", "EDITOR"] },
     { href: "/admin/users", label: "Users", roles: ["ADMIN", "SUPER_ADMIN"] },
   ];
   ```
   Filtered with `NAV_LINKS.filter(link => link.roles.some(role => user.roles.includes(role)))`. This layout **does** highlight the active link (unlike the public header). `Role` is imported from `@4ef/shared`.

**For org-scoped monetisation nav** (organiser/academy sections, likely gated by org membership role rather than platform role), this admin-layout array is the only precedent to extend — there is no generic "role-filtered nav" utility to import as-is.

---

## 9. Icons

**lucide-react**, confirmed both by `components.json` (`"iconLibrary": "lucide"`) and by usage — it is the only icon import anywhere in `src/`.

- **Sizing**: exclusively the Tailwind `size-N` utility (`size-4`, `size-3.5`, `size-1/2`, etc. — 39 call sites). The `h-4 w-4` idiom (common in older shadcn docs) is never used — zero hits.
- **Stroke width**: never overridden — default lucide stroke (2) everywhere.
- Icons placed as direct children of `Button`/`Badge` auto-size correctly without an explicit class, via a selector baked into those components' variant classes (`[&_svg:not([class*='size-'])]:size-4`, scaled down for `sm`/`xs` variants).

---

## 10. Components that already exist

All in `apps/web/src/components/ui/` (shadcn "base-nova" style, built on `@base-ui/react` primitives — **not** Radix), styled with `cva` + `cn()` (`clsx` + `tailwind-merge`, `src/lib/utils.ts`).

| Component | File | Variants / notes |
|---|---|---|
| **Button** | `ui/button.tsx` | `variant`: `default \| outline \| secondary \| ghost \| destructive \| link`. `size`: `default \| xs \| sm \| lg \| icon \| icon-xs \| icon-sm \| icon-lg`. Polymorphic via `render` prop (e.g. `<Button render={<Link href="/x" />}>`) — the established link-as-button pattern. `destructive` is a *tinted* style (`bg-destructive/10 text-destructive`), not solid. |
| **Badge** | `ui/badge.tsx` | `variant`: `default \| secondary \| destructive \| outline \| ghost \| link`. **No semantic status variants** (no success/warning/info) — see the colour gap in §2. |
| **Card** | `ui/card.tsx` | Sub-parts: `Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter`. `size?: "default" \| "sm"`. `rounded-xl`, `ring-1 ring-foreground/10`, no shadow. `CardFooter` has built-in `border-t bg-muted/50`. `CardTitle` uses `font-heading`. |
| **Table** | `ui/table.tsx` | Sub-parts: `Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption`. Wrapped in `overflow-x-auto` — **horizontal scroll is the only responsive behaviour**, no stacked-card breakpoint variant exists (see §13 gap). Cells `whitespace-nowrap` by default. |
| **Dialog** | `ui/dialog.tsx` | Centered modal. Used for every admin CRUD form (team/player/news/competition create-edit, record-event, manage-entries, edit-roles). `showCloseButton?: boolean` (default true). `DialogFooter` has `showCloseButton?: boolean` that auto-injects an outline "Close" button. |
| **Sheet** | `ui/sheet.tsx` | Slide-in panel, same underlying primitive as Dialog. Used exactly once today: the mobile public-nav drawer. `side?: "top" \| "right" \| "bottom" \| "left"` (default `right`). Fixed width `w-3/4 sm:max-w-sm`. |
| **Skeleton** | `ui/skeleton.tsx` | Single primitive: `animate-pulse rounded-md bg-muted`. Manually sized per call-site — no standard shapes. **Used inconsistently** (see §12). |
| **Sonner (toast)** | `ui/sonner.tsx` | Mounted once in `providers.tsx`: `<Toaster richColors position="top-right" />`. Custom icon set for all 5 states. Usage: `toast.success(...)`/`toast.error(...)` called directly in mutation `onSuccess`/`onError`. |
| **Input** | `ui/input.tsx` | `h-8`. Error state driven by `aria-invalid`, no separate error prop. |
| **Select** | `ui/select.tsx` | Sub-parts: `Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, Select{Scroll}{Up,Down}Button`. `SelectTrigger` `size?: "sm" \| "default"`. |
| **DropdownMenu** | `ui/dropdown-menu.tsx` | Full submenu/checkbox/radio-item support **installed but unused** — zero call sites in `features/`/`app/`. |
| **Checkbox** | `ui/checkbox.tsx` | `size-4`, `data-checked` state. |
| **Label**, **Textarea** | `ui/label.tsx`, `ui/textarea.tsx` | Plain styled native elements. Textarea has `field-sizing-content`. |

**Does not exist as a component, anywhere:** Tabs, Pagination, Avatar, Spinner, Empty state, Separator, Tooltip, Popover, Accordion, Breadcrumb, Progress/Stepper, semantic-status Badge, Money/currency formatter (presentational — the math exists, see §14).

**Brand components** (`apps/web/src/components/brand/`):
- `Monogram` — inline SVG, hardcoded `#A238FF` fill, `aria-hidden`.
- `Wordmark` — `<span className="font-display text-lg uppercase tracking-wide">` with two-tone spans (`text-primary` + `text-foreground`). The only logo component; used in header and footer.

**Media component** (`apps/web/src/components/media/entity-image.tsx`):
- `EntityImage({ src, alt, fallback: "team"|"player"|"competition"|"news", className, sizes? })` — renders `next/image` when `src` is set, else an icon-in-muted-box fallback (`Shield`/`UserRound`/`Newspaper` via lucide). This is the closest thing to an "avatar" primitive in the app and is directly reusable for org logos.

---

## 11. Forms

**react-hook-form + zod + `@hookform/resolvers`** (`zodResolver`) — confirmed in `package.json`, used consistently (e.g. `apps/web/src/features/teams/team-form-dialog.tsx` + sibling `schemas.ts`).

Pattern, reading from `team-form-dialog.tsx`:
- Zod schema in a sibling `schemas.ts`; optional string fields modeled `.optional().or(z.literal(""))` to stay compatible with controlled empty-string inputs.
- `useForm<T>({ resolver: zodResolver(schema), defaultValues })`, reset via `useEffect` whenever the dialog opens (the standard "reset on open" idiom for dual-purpose create/edit dialogs).
- Plain uncontrolled `<Input {...register("name")} />` — **the shadcn `<Form>` wrapper was never installed**, so there's no `FormField`/`FormMessage` abstraction.
- Field errors: manual, repeated per-field, no shared component:
  ```tsx
  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
  ```
- Non-native fields (image upload) go through RHF's `Controller`.
- **Submit-button loading state is NOT a spinner** — confirmed by grep, `Loader2`/`animate-spin` appear nowhere in `features/`/`app/` (only inside the Sonner toast library's own internals). The pattern is text-swap + disable, driven by the *parent's* react-query mutation state, not RHF's own `isSubmitting`:
  ```tsx
  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</Button>
  // where isSubmitting = createMutation.isPending || updateMutation.isPending
  ```
  This is directly relevant to brief §4.3's "Processing" payment state — there is no existing spinner-in-button visual to copy; a monetisation Pay button introducing one would be a genuinely new (if small) pattern, worth flagging rather than silently inventing.
- File upload (`features/media/image-upload-field.tsx`) manages its own `isUploading` state outside RHF entirely, uploads on file-select, toasts result, reports the URL back via `onChange`.

---

## 12. Data fetching

**axios** (`apps/web/src/lib/api-client.ts`) — `baseURL` from `NEXT_PUBLIC_API_URL`, `withCredentials: true`, in-memory access token via a request interceptor, single-flight refresh-on-401 via a response interceptor.

**@tanstack/react-query v5** on top (`QueryClient` created once in `providers.tsx`, `{ retry: 1, staleTime: 30_000 }`). No shared `useXQuery` hook layer — every feature calls `useQuery`/`useMutation` directly in the page component against a plain async function in `features/*/api.ts`.

**Loading/error/empty handling is genuinely inconsistent across the app — three different idioms coexist, not one:**

1. `app/fixtures/page.tsx` — Skeleton array for loading (`5× <Skeleton className="h-16 rounded-md" />`), `<p className="text-destructive">` for error, `<p className="text-muted-foreground">` for empty.
2. `app/admin/teams/page.tsx` — plain `<p>Loading teams...</p>` text, **no error state handled at all** (a failed fetch just renders an empty table silently).
3. `app/competitions/[slug]/page.tsx` — full-page loading/error treatment for the primary query, but the five secondary queries (standings, form, scorers, assists, fixtures) have **no loading state** at all (nothing renders while pending) and only bare empty-array messages once resolved.

**There is no shared `<LoadingState>`/`<ErrorState>`/`<EmptyState>` component.** The brief's §4.2 rule ("every screen needs four states... use the app's existing patterns") has no single existing pattern to point to — this is a real decision point, not a lookup (see §15 gap list).

---

## 13. Tables and lists on mobile

Checked the standings table (`competitions/[slug]/page.tsx`) and both admin tables (`admin/teams`, `admin/users`) directly, cross-checked against the `-375.png` screenshots.

**No responsive stacking behaviour exists anywhere.** Every table relies solely on `Table`'s built-in `overflow-x-auto` wrapper div — horizontal scroll is the only mobile affordance. Cells are `whitespace-nowrap` by default. There is no column-hiding convention (`hidden md:table-cell`), no "priority column" idiom, no card-per-row alternative at any breakpoint. Confirmed visually: the standings table and admin tables in the `-375.png` shots are simply narrower/scrollable versions of the desktop table, not restructured. The brief explicitly forbids this pattern for anything a user has to act on (§4.5) — an invoice/registration-status table cannot copy this as-is and needs new composition (see §15).

---

## 14. Money and numbers

**Nothing exists in `apps/web`** — grep for `Intl.NumberFormat`, `kobo`, `naira`, `₦`, `formatCurrency`, `Money` across the whole `apps/web/src` tree returns zero matches. **No `tabular-nums` usage anywhere either** — money/number column alignment has never been needed yet.

The formatting logic already exists, correctly, in the **shared package** — `packages/shared/src/pricing.ts`:

```ts
export const CURRENCY = "NGN" as const;

export function formatNaira(kobo: number): string {
  if (!Number.isInteger(kobo)) {
    throw new Error(`formatNaira received a non-integer kobo amount: ${kobo}`);
  }
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: kobo % 100 === 0 ? 0 : 2,
  }).format(naira);
}
```

Same file also defines `COMPETITION_TIERS`, `ONBOARDING_FEE_KOBO`, `PLAYER_REGISTRATION`, `ACADEMY_PLANS`, `ADD_ONS`, `ANNUAL_PREPAY_DISCOUNT` — all integer-kobo, already the source of truth for every price shown anywhere in this brief, and already imported by `apps/api`'s invoices/payments/player-registrations/academy modules. A build-time guard (`apps/api/scripts/check-money-literals.ts`) already exists to catch stray hardcoded money literals on the backend.

**Conclusion**: the brief's required single `<Money>` component (§4.1) should be a **thin presentational wrapper around `formatNaira` from `@4ef/shared`** — the math must not be reimplemented in `apps/web`, only a `<Money kobo={n} />`-shaped component needs to be added (doesn't exist yet, anywhere).

---

## 15. Gaps — components the monetisation UI needs that don't exist yet

Per §1.4: nothing below should be built yet. Each proposes composing from what §10–14 already established, using only existing tokens/primitives.

### 15.1 `<Money>` 
**Need**: canonical, single currency display component (brief §4.1, non-negotiable "no exceptions").
**Compose from**: `formatNaira()` from `@4ef/shared` (already correct) + Tailwind's built-in `tabular-nums` utility (not a new token — a default Tailwind class, unused so far but not forbidden) + `text-right` in table contexts per the brief's own alignment rule.
```tsx
// components/monetisation/money.tsx
function Money({ kobo, className }: { kobo: number; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{formatNaira(kobo)}</span>;
}
```
No new color, no new size — inherits whatever text style the caller sets (a table cell, a heading, etc.), exactly like the brief's instruction that money is formatting, not a visual identity of its own.

### 15.2 Semantic status Badge (paid / pending / overdue / confirmed / failed)
**Need**: brief §4.3 requires distinguishable payment states; current `Badge` only has `default/secondary/destructive/outline/ghost/link` — no success/warning.
**Compose from**: the `--live` token (`#35d07f`, defined but unwired — §2) is the only existing green in the system, and `--destructive` (`#ff5470`) the only existing red. There is genuinely no amber/warning token anywhere in `globals.css`. Two honest options, not a silent choice:
- (a) Extend `badgeVariants` in `ui/button.tsx`... *no — do not edit the shared component (§0 hard rule).* Compose a **new** wrapper in `components/monetisation/` that maps a status enum to the *existing* Badge variants + an icon (brief §4.6 requires colour never stand alone anyway): `paid → default` (primary violet) or wraps `--live` green via inline style/class since no Badge variant exposes it, `pending → secondary`, `failed/overdue → destructive`. 
- (b) **Stop and ask** (per the brief's own §0 rule 1) whether promoting `--live` to a real `success` badge variant counts as "inventing a token" (it's an existing value, just uncomponentized) — this is exactly the kind of boundary call the brief says to raise rather than guess.
Proposed markup for option (a), zero new tokens, icon per brief §4.6:
```tsx
// components/monetisation/payment-status-badge.tsx
const statusConfig = {
  paid:    { variant: "default" as const,      icon: CheckCircle2 },
  pending: { variant: "secondary" as const,     icon: Clock },
  overdue: { variant: "destructive" as const,   icon: AlertCircle },
};
function PaymentStatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const { variant, icon: Icon } = statusConfig[status];
  return <Badge variant={variant}><Icon className="size-3.5" />{label(status)}</Badge>;
}
```

### 15.3 Stepper (competition creation wizard, A2)
**Need**: multi-step flow with a visible progress indicator.
**Compose from**: no Tabs component exists either (confirmed §10), so there's no existing step-like primitive at all. Build from `Card` + `Button` + a manually laid out row of numbered circles using existing radius/color tokens (`bg-primary`/`bg-muted` per step state, `rounded-full`, connected by `border-t` segments) — no new visual language, just composition. Flag to the user: this is a genuinely new pattern, not a reuse, and should be shown before building.

### 15.4 Tier/price selector cards (A2)
**Need**: 4 selectable tier cards with a pre-selected recommendation.
**Compose from**: `Card` (existing, ring-only per §5) in a grid, `Badge` for "Recommended", `Money` (15.1) for the price, `Button variant="outline"` becoming `variant="default"` on selection (no new variant needed — just conditional existing-variant swap, matching how `Badge` already does `isActive ? "default" : "secondary"` elsewhere in the codebase per §10).

### 15.5 Payment state machine UI (six states, §4.3)
**Need**: idle/processing/awaiting-confirmation/confirmed/failed/expired, in one surface.
**Compose from**: `Card` for the container, existing `Button` `disabled` state for processing (brief flags this needs a spinner the codebase doesn't have yet — §11 gap: **no existing spinner pattern to copy**, this is new and should be raised explicitly, likely a lucide `Loader2` with `animate-spin` since that Tailwind utility already exists, just never used in a button before), `Badge`+icon per §15.2 for the compact status, plain text blocks for the explanatory copy per state. No dialog/modal — the brief's payment flow is a full screen, not a popup, consistent with Dialog only being used for admin CRUD today.

### 15.6 Offline/sync indicator (§4.4)
**Need**: persistent, non-modal connection state: `Online · synced` / `Offline · N queued` / `Syncing…` / `Sync failed · retry`.
**Compose from**: nothing in the current app has an always-visible status strip — closest precedent is Sonner's toast icon set (5 states already themed and colour-appropriate) but toasts are transient and the brief explicitly forbids a blocking/transient treatment here. Propose a new small pill component reusing `Badge`'s visual language (rounded, `text-xs`, existing colour tokens) but rendered inline/persistent rather than via the toast system — genuinely new composition, worth a screenshot-and-confirm rather than silent build.

### 15.7 Empty/loading/error state components (§4.2)
**Need**: one consistent treatment, brief explicitly says "use the app's existing patterns" — but §12 established there are **three different existing patterns**, not one.
**Not a component gap so much as a decision gap**: propose standardizing on the `Skeleton`-array approach (`fixtures/page.tsx`'s pattern) since it's the most polished of the three already-existing idioms, wrapped as `components/monetisation/list-states.tsx` (`<ListSkeleton count={n} />`, `<ErrorState message action? />`, `<EmptyState message action />` per the brief's "empty state carries the primary action" rule) — composed from `Skeleton` + `Button` + `p`, no new tokens. Flagging this choice explicitly rather than picking silently, since it's a precedent every subsequent phase inherits.

### 15.8 Mobile-stacked table/list (§4.5, §13)
**Need**: data tables become cards below the mobile breakpoint — brief says "never a horizontally scrolling table on mobile for anything a user has to act on," but §13 confirmed **every existing table in the app does exactly that**.
**Compose from**: no existing precedent at all to copy — this is the single largest genuine gap the audit found. Proposed composition: at `sm:` and above, render the existing `Table`; below `sm`, render the same row data as a stack of existing `Card`s (`CardHeader` = primary identifier, `CardContent` = key-value pairs using existing `text-sm`/`text-muted-foreground` label styling already seen in detail pages). This is a new responsive pattern for the app, not a reskin of an existing one — should be shown side-by-side per brief §2 pilot instructions before it propagates to every subsequent list screen.

### 15.9 Receipt / line-item summary view (A3, D1)
**Need**: invoice line items + total, 50/50 schedule.
**Compose from**: `Table` (or, given §15.8, the mobile-stacked variant) for line items, `Money` right-aligned per row, `CardFooter`'s existing `border-t bg-muted/50` treatment (already used to visually separate a footer from body — directly reusable for a "Total" row) — no new component needed beyond `Money` itself.

### 15.10 Pagination
**Need**: several new list screens (organiser registration console, billing centre, media library) will be data-dense enough to need it.
**Compose from**: not a gap — `app/fixtures/page.tsx:75-97`'s hand-rolled Prev/Next (`Button variant="outline" size="sm"` × 2 + a page-count `<span>`) is a directly copyable existing pattern, just never extracted into a shared component. Worth extracting into `components/monetisation/pagination.tsx` (or a more central location) rather than re-copy-pasting a fourth time, per the brief's own §3 rule ("if you find yourself copy-pasting styles... stop").

### 15.11 Admin mobile nav (pre-existing gap, not monetisation-specific, but inherited by every new organiser/admin screen)
Per §7: the admin sidebar has no mobile presentation at all. Any new organiser-console or billing-admin screen (A4, B6, D1, D2) built inside `/admin`-equivalent chrome inherits total inaccessibility below 640px unless this is fixed first. **Flagging per brief §0/§6** ("if you believe a third change to an existing page is necessary, stop and ask") — this is exactly that situation: fixing it means touching `admin/layout.tsx`, an existing page, outside the two permitted additive changes.

---

## 16. Summary for sign-off

- Source of truth: `apps/web/src/app/globals.css` (`@theme inline` + `:root`) + `apps/web/components.json`. No tailwind.config.
- 14 shadcn primitives exist; Tabs/Pagination/Avatar/Spinner/Empty-state/semantic-status-Badge do not.
- One semantic status colour (`destructive`); one more (`--live`) defined but unwired.
- Money formatting logic already exists correctly in `@4ef/shared`; zero presentation layer exists in `apps/web`.
- Three inconsistent loading/error/empty idioms coexist; no shared state components.
- Zero responsive/mobile-stacking table pattern exists anywhere — the brief's mobile-table rule has no precedent to copy.
- Admin nav has a pre-existing, non-monetisation mobile-access gap that every new admin-shaped screen will inherit.

**11 gaps identified (§15.1–15.11), all proposed as compositions of existing primitives and tokens, none requiring a new colour/font/radius/shadow/spacing value.** Two (§15.2's colour boundary call, §15.11's existing-page-fix question) are explicit stop-and-ask points per the brief's own rules, not silent decisions.

Awaiting confirmation before the pilot screen (§2, the squad builder).
