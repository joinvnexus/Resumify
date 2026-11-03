# Resumify

> A production-ready, open-source SaaS resume builder built with **Next.js 15**, **TypeScript**, **Prisma**, **Stripe**, **Zustand**, **Tailwind CSS**, and **Anthropic Claude AI**.

![License: MIT](https://img.shields.io/badge/License-MIT-green)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Features

### Core Builder

| Feature | Details |
|---|---|
| **10 Resume Templates** | Classic, Modern, Minimal, Executive, Creative, Compact, Timeline, Elegant, Technical, Bold |
| **Live Preview** | Reactive A4-scaled preview, rescales to any viewport |
| **Theme Switcher** | Light / dark mode, persisted to localStorage |
| **Font Switcher** | 8 Google Fonts + curated pairings, applied live |
| **Accent Color Picker** | 8 presets + custom colour input |
| **Custom Color Palettes** | Save up to 8 full palettes per resume |
| **ATS Score Checker** | 12-point weighted checklist with animated ring |
| **Drag & Drop Reordering** | Section-level reorder via @dnd-kit |
| **Skills Tag Input** | Enter or comma to add, backspace to remove |
| **Experience CRUD** | Add / edit / delete with confirmation dialog |
| **Education CRUD** | Add / edit / delete with confirmation dialog |
| **Projects CRUD** | Add / edit / delete with confirmation dialog |
| **Custom Sections** | Unlimited free-form sections |
| **Photo Upload** | Client-side square-crop + JPEG compression |
| **Cover Letter Builder** | Template + live preview |
| **Undo / Redo** | 50-step history, Ctrl+Z / Ctrl+Y keyboard shortcuts |
| **PDF Export** | Multi-page A4, dynamically imported html2canvas + jsPDF |
| **DOCX Export** | Word (.docx) via docx library |
| **Plain-text Export** | Clipboard copy + .txt download for ATS paste |
| **HTML Upload** | Import existing HTML resumes (sanitized) |
| **Print** | Native browser print with print-only CSS |
| **Reset** | Two-step confirmation wipe with toast feedback |
| **Storage Monitor** | Live localStorage usage badge with overflow warning |
| **Error Boundary** | Friendly error page with digest ID |
| **404 Page** | Branded not-found page |

### Authentication & Accounts

| Feature | Details |
|---|---|
| **OAuth Sign-in** | Google and GitHub via NextAuth.js v5 |
| **Email + Password** | Credentials provider with bcrypt (12 rounds) |
| **Password Strength** | Min 8 chars, uppercase, number, confirmation |
| **Forgot Password** | (planned) password reset flow |
| **Profile Management** | Update display name, view plan, sign out |
| **JWT Sessions** | NextAuth JWT strategy with plan metadata |

### Subscriptions & Billing

| Feature | Details |
|---|---|
| **Free Plan** | 3 resumes, 3 templates, 5 AI calls/day |
| **Pro Plan** | $9/month — Unlimited resumes, all templates, unlimited AI |
| **Stripe Checkout** | Subscription checkout with promotion code support |
| **Billing Portal** | Self-service upgrade, cancel, payment method update |
| **Webhook Handling** | Signed Stripe webhooks for subscription lifecycle |

### AI Features (Claude API)

| Feature | Description |
|---|---|
| **AI Summary** | Generate a professional summary paragraph |
| **AI Bullet Writer** | Rewrite job descriptions into achievement bullets |
| **AI Cover Letter** | Draft a personalized cover letter body |
| **ATS Keyword Gap** | Find missing keywords from a job description |

Free plan: 5 AI calls per 24h rolling window. Pro: unlimited.

### Analytics & Tracking

| Feature | Details |
|---|---|
| **View Tracking** | Track views on public resumes |
| **ATS History** | Score snapshots over time |
| **PostHog Analytics** | Optional product analytics (page views, custom events) |
| **User Analytics Dashboard** | Views, ATS scores, sparklines per resume |
| **Admin Dashboard** | Platform stats: total users, Pro conversion, AI usage |

### Public Resume Sharing

| Feature | Details |
|---|---|
| **Public Links** | Toggle any resume to public via random slug |
| **QR Code Sharing** | Generate QR codes for mobile viewing |
| **View Counter** | Track how many times your public resume is viewed |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourname/Resumify.git
cd Resumify

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.local.example .env.local

# 4. Set up the database (PostgreSQL)
#    Update DATABASE_URL in .env.local, then:
npx prisma migrate dev --name init

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required Environment Variables

These variables must be set in `.env.local` for the app to run:

| Variable | Description | How to get |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Neon, Supabase, or self-hosted |
| `AUTH_SECRET` | NextAuth session signing secret | `openssl rand -base64 32` |
| `AUTH_URL` | Production base URL for NextAuth | Your live domain |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials | [Google Cloud Console](https://console.developers.google.com) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth credentials | [GitHub Developers](https://github.com/settings/developers) |
| `ANTHROPIC_API_KEY` | Claude API key for AI features | [Anthropic Console](https://console.anthropic.com/settings/keys) |

### Optional Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | App base URL | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | App name for display | `Resumify` |
| `STRIPE_SECRET_KEY` | Stripe secret key | |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | |
| `STRIPE_PRO_PRICE_ID` | Stripe Pro plan price ID | |
| `RESEND_API_KEY` | Transactional email API key | |
| `EMAIL_FROM` | Default "from" email address | `noreply@Resumify.app` |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key | (analytics disabled) |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog API host | `https://app.posthog.com` |
| `ADMIN_EMAILS` | Comma-separated admin emails for `/admin` and `/api/admin/*` (case-insensitive). **Required for admin access: if unset or empty, nobody is an admin.** | |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run type-check` | TypeScript check without emit |
| `npm run lint` | ESLint with Next.js rules |

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root HTML shell, fonts, metadata
│   ├── page.tsx                  # Landing page
│   ├── globals.css               # Design tokens, template CSS, base resets
│   ├── error.tsx                 # Error boundary
│   ├── not-found.tsx             # 404 page
│   ├── loading.tsx               # Route-level loading skeleton
│   ├── middleware.ts             # Edge-safe route protection (auth)
│   │
│   ├── api/                      # RESTful API routes
│   │   ├── auth/register/route.ts      # User registration
│   │   ├── profile/route.ts            # Profile updates
│   │   ├── resumes/route.ts            # List & create resumes
│   │   ├── resumes/[id]/route.ts       # Get/update/delete resume
│   │   ├── resumes/[id]/save/route.ts  # Cloud save (debounced)
│   │   ├── resumes/[id]/duplicate/route.ts
│   │   ├── resumes/[id]/visibility/route.ts
│   │   ├── resumes/[id]/view/route.ts  # View tracking
│   │   ├── stripe/checkout/route.ts    # Create checkout session
│   │   ├── stripe/webhook/route.ts     # Webhook handler (signed)
│   │   ├── stripe/portal/route.ts      # Billing portal session
│   │   ├── ai/summary/route.ts         # AI summary generation
│   │   ├── ai/bullet/route.ts          # AI bullet improvement
│   │   ├── ai/cover-letter/route.ts    # AI cover letter
│   │   ├── ai/ats-keywords/route.ts    # ATS keyword gap analysis
│   │   ├── ai/usage/route.ts           # AI quota status
│   │   ├── analytics/ats/route.ts      # ATS score history
│   │   ├── analytics/resumes/route.ts  # User analytics summary
│   │   └── admin/stats/route.ts        # Admin platform stats
│   │
│   ├── auth/login/page.tsx       # Sign-in page
│   ├── auth/register/page.tsx    # Registration page
│   ├── auth/error/page.tsx       # Auth error page
│   ├── dashboard/page.tsx        # User dashboard (resume list)
│   ├── dashboard/analytics/page.tsx     # Analytics dashboard
│   ├── builder/[id]/page.tsx     # Resume builder (authenticated)
│   ├── billing/page.tsx          # Stripe billing page
│   ├── profile/page.tsx          # User profile page
│   ├── admin/page.tsx            # Admin dashboard (email-gated)
│   ├── r/[slug]/page.tsx         # Public resume viewer
│   ├── terms/page.tsx            # Terms of Service
│   └── privacy/page.tsx          # Privacy Policy
│
├── components/                    # ~50 React components
│   ├── layout/                    # App shell (Providers, Topbar, etc.)
│   ├── editor/                    # Left panel input components
│   ├── preview/                   # Right panel live preview
│   ├── templates/                 # 10 resume template components
│   ├── ui/                        # Reusable primitive components
│   ├── shared/                    # Cross-cutting components
│   ├── auth/                      # Login/Register/Profile forms
│   ├── builder/                   # Builder orchestrator
│   ├── dashboard/                 # Dashboard components
│   ├── billing/                   # Billing page client
│   └── analytics/                 # Admin & user dashboards
│
├── hooks/                         # 18+ custom React hooks
│   ├── useAtsScore.ts
│   ├── useAutoSave.ts
│   ├── useClipboard.ts
│   ├── useCloudSync.ts
│   ├── useDebounce.ts
│   ├── useExportExtended.ts
│   ├── useKeyboardShortcuts.ts
│   ├── useLocalStorage.ts
│   ├── usePdfExport.ts
│   ├── usePlan.ts
│   ├── usePreviewScale.ts
│   ├── useResizeObserver.ts
│   ├── useResetResume.ts
│   ├── useResumeExport.ts
│   ├── useResumeLimit.ts
│   ├── useTheme.ts
│   ├── useAiGenerate.ts
│   └── useAiUsage.ts
│
├── lib/                           # Pure domain logic (no React)
│   ├── ats.ts                     # ATS score calculation
│   ├── auth.ts                    # NextAuth config (server-only)
│   ├── auth.config.ts             # Edge-safe auth config
│   ├── claude.ts                  # Anthropic Claude client singleton
│   ├── stripes.ts                 # Stripe client + plan config
│   ├── db.ts                      # Prisma client singleton
│   ├── analytics.ts               # Server-side analytics helpers
│   ├── posthog.ts                 # PostHog analytics integration
│   ├── email.ts                   # Resend email templates
│   ├── ai-usage.ts                # AI quota tracking
│   ├── ai-prompts.ts              # Claude prompt templates
│   ├── resume-sync.ts             # DB sync helpers
│   ├── schemas.ts                 # Zod validation schemas
│   ├── storage.ts                 # Versioned localStorage abstraction
│   ├── constants.ts               # Templates, fonts, colors, defaults
│   ├── pdf.ts                     # Multi-page A4 PDF export
│   ├── docx-export.ts             # Word export
│   ├── text-export.ts             # Plain-text export
│   ├── compress-image.ts          # Canvas image compression
│   ├── qrcode.ts                  # QR code generation
│   └── cover-letter.ts            # Cover letter generation
│
├── store/
│   ├── resume-store.ts            # All resume data, CRUD, undo/redo (Zustand + Immer)
│   ├── ui-store.ts                # Theme, toasts, view, export progress
│   └── index.ts                   # Barrel exports
│
├── types/
│   ├── index.ts                   # All TypeScript interfaces
│   └── next-auth.d.ts             # NextAuth session/jwt type augmentation
│
├── __mocks__/
│   └── prisma.ts                  # Prisma mock (for testing)
│
└── utils/
    └── index.ts                   # cn(), generateId(), generateSlug(), arrayMove(), etc.
```

---

## Architecture

### State Management

Two Zustand stores keep concerns separated:

- **`resume-store`** — all resume content + 50-step undo/redo history stack (persisted to localStorage)
- **`ui-store`** — ephemeral UI state: theme, toasts, section open/close, export progress

Both use Immer for safe, immutable mutations. The resume store maintains a 50-entry history using JSON snapshots with 600ms debounce on text inputs.

### Authentication

NextAuth.js v5 with JWT sessions. Three providers:
- Google OAuth
- GitHub OAuth
- Credentials (email + bcrypt-hashed password)

Middleware (`src/middleware.ts`) runs in the Edge runtime for route protection. A separate `auth.config.ts` avoids importing Prisma/bcrypt in the Edge runtime.

### Database

Prisma ORM with PostgreSQL. Models include `User`, `Account`, `Session`, `Resume`, `AiUsage`, `AtsScoreHistory`, `ResumeView`, and `VerificationToken`.

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Billing

Stripe Checkout sessions for Pro subscriptions ($9/month). Webhooks (signed) handle subscription lifecycle events:
- `checkout.session.completed` → upgrade to Pro
- `customer.subscription.updated` → update plan/expiry
- `customer.subscription.deleted` → downgrade to Free
- `invoice.payment_failed` → log for follow-up

### AI Features

Claude API (`claude-sonnet-4-6`) powers four features:
- Professional summary generation
- Achievement bullet rewriting
- Cover letter drafting
- ATS keyword gap analysis

Free plan: 5 AI calls per 24h rolling window. Pro: unlimited.

### Template CSS Strategy

Template classes (`.tpl-classic`, `.r-header`, etc.) live in `globals.css` as plain CSS, not Tailwind utilities. This ensures identical rendering between live preview and html2canvas PDF snapshots.

### PDF Export

`lib/pdf.ts` dynamically imports `html2canvas` and `jsPDF` — together ~250KB, never in the initial bundle. Multi-page export renders each A4 page at retina scale and stitches them into a single PDF.

### Storage Versioning

`lib/storage.ts` wraps every localStorage entry in `{ v: 2, ts: Date.now(), data: T }`. Version mismatches on read silently discard stale data and fall back to defaults.

---

## Development

### Setup

```bash
npm install
cp .env.local.example .env.local
npx prisma migrate dev --name init
npm run dev
```

### Environment Setup Guides

- [Stripe Setup](./docs/stripe-setup.md) — full walkthrough for wiring up billing and webhooks

### Type Checking & Linting

```bash
npm run type-check   # tsc --noEmit
npm run lint          # ESLint with Next.js rules
```

---

## Deployment

### Vercel (recommended)

```bash
npx vercel --prod
```

No additional configuration needed.

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

Enable standalone output in `next.config.ts`:

```ts
output: 'standalone'
```

---


## Author

**[Joinvnexus](https://github.com/joinvnexus)** — maintainer of Resumify.

## License

Copyright © 2026 [Joinvnexus](https://github.com/joinvnexus).

Licensed under the MIT License. See [LICENSE](./LICENSE) for details.
