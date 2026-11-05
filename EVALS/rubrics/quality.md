# Loop-Evals Quality Rubric: Exile — Frontier-Grade Learning Platform

> **Layer 2 Advisory Judge Rubric (Fixed Schema)**
> This rubric governs artifact quality ONLY after Layer 1 (`scripts/verify-fast` and `scripts/verify-full`) passes with 0 constraint violations. A high rubric score can NEVER override a deterministic Layer 1 failure. Any score `< 4` on any dimension triggers a targeted `[[loop-repair]]` pass.

---

## Grading Schema (JSON Output Contract)

Every rubric evaluation MUST output a structured JSON verdict conforming to:

```json
{
  "iteration_id": "string",
  "deterministic_gate_passed": true,
  "dimensions": {
    "zero_hardcoding": { "score": 1-5, "evidence": ["file:line or route checked"], "violations": [] },
    "frontier_ui_boardui": { "score": 1-5, "evidence": ["component/token references"], "violations": [] },
    "interactivity_closed_loop": { "score": 1-5, "evidence": ["flows/endpoints verified"], "violations": [] },
    "no_promotional_slop": { "score": 1-5, "evidence": ["strings/titles inspected"], "violations": [] }
  },
  "rubric_mean": 0.0,
  "pass": true,
  "blocking_findings": []
}
```

---

## Dimension A: Zero Hardcoding & Data Dynamism (Weight: 30% — Hard Floor: 5/5)

Zero tolerance for mock/demo artifacts masquerading as functional state:
- **Forbidden literals & patterns**:
  - `849201` or `demo-room` anywhere in `src/` (including `src/lib/rooms/store.ts`, route handlers, and UI fallbacks).
  - Static student/player counts such as `Daftar siswa (4)`, hardcoded `4 siswa`, or fixed array lengths instead of dynamic `state.players.length`.
  - Fake teacher names injected without user input or authenticated session context.
  - Unpersisted studio quizzes that exist only in local component state and vanish on navigation or reload.
- **Score 5 (Frontier — Required)**:
  - Every room PIN is generated dynamically via `POST /api/rooms/create` and persisted to Supabase (`rooms` table).
  - Fresh rooms initialize with `0` players; player counts and roster update dynamically from real-time state (`players` table / room store).
  - Teacher identity derives from authenticated user profile, explicit input, or clean anonymous teacher session without hardcoded fake personas.
  - Custom and AI-generated quizzes in `/studio` persist to Supabase (`quizzes` and `questions` tables) before launching a room.
- **Score 3 (Unacceptable for Release)**: Dynamic flow exists, but fallback mock PINs or seeded demo rooms still remain in `src/lib/rooms/store.ts`.
- **Score 1 (Sloppy / Hard Fail)**: Hardcoded PIN `849201`, `demo-room`, or static player counts appear in `src/`.

---

## Dimension B: Frontier UI & BoardUI Compliance (Weight: 25% — Hard Floor: 4/5)

Strict adherence to installed BoardUI components, semantic design tokens, composite typography, and crisp Light/Dark contrast:
- **Required Architecture**:
  - Uses installed BoardUI components (`Button`, `Badge`, `Modal`, `Input`, `Tabs`, `SegmentedControl`, etc.) rather than fragile raw HTML lookalikes.
  - Uses semantic color tokens (`bg-background-primary-default`, `bg-background-secondary-default`, `text-text-primary`, `text-text-secondary`, `border-border-button-default`, `border-separator-border`) and clean high-contrast slate/zinc Light & Dark themes via `next-themes`.
  - Uses composite typography utilities (`text-title-1-medium`, `text-headline-medium`, `text-body-medium`, `text-caption-1-semibold`, etc.) and merges classes with `cx()`.
  - Zero legacy gold/brown hex literals (`#CA8A04`, `#140D08`, `#1A0F0A`, `#F5E6D3`, `#331F14`).
  - Modals and drawers render via proper top-level portals (`createPortal(..., document.body)` or React Aria Modal portals) so they are never trapped inside a header's `backdrop-blur` stacking context.
- **Score 5 (Frontier)**: Complete BoardUI component & token discipline, crisp WCAG AAA/AA contrast in both Light and Dark modes, responsive layout reflow across mobile and desktop, and zero portal/stacking bugs.
- **Score 3 (Acceptable)**: Clean Light/Dark theme and working modals, but mixes raw Tailwind palette classes where BoardUI components/tokens should be used.
- **Score 1 (Sloppy / Hard Fail)**: Uses legacy gold/brown hex codes (`#CA8A04`, `#140D08`, etc.), broken contrast in light mode, or modals clipped inside `backdrop-blur` containers.

---

## Dimension C: Full Interactivity & Closed-Loop Functionality (Weight: 30% — Hard Floor: 5/5)

Every user-facing surface must be genuinely interactive and wired end-to-end:
- **Required Capabilities**:
  1. **Interactive Question Rows**: Every question row in the Question Bank / Studio table is clickable and expandable to inspect full options, correct answer, distractor rationales, concept tag, and remedial metadata.
  2. **Live Option Testing**: Users can test/try options directly inside the expanded question view or interactive preview with immediate visual and audio feedback plus diagnostic rationale.
  3. **Custom Question Editing & Creation**: Teachers can create new questions and edit existing questions (stem, options, correct index, rationale, concept tag, difficulty) in `/studio`.
  4. **Real Supabase Persistence**: End-to-end persistence in Supabase across `quizzes`, `questions`, `rooms`, `players`, and `submissions` tables.
  5. **Working Auth & Settings**: Functional `/login` and `/auth/callback` flows (Supabase Auth + Google OAuth / credentials + guest fallback) and a global Settings modal persisting preferences (`exile_user_settings` in `localStorage`) with immediate session effect.
- **Score 5 (Frontier — Required)**: All 5 capabilities work seamlessly end-to-end with real persistence and zero dead buttons.
- **Score 3 (Partial)**: Question rows expand, but editing/creation or Supabase persistence is incomplete.
- **Score 1 (Sloppy / Hard Fail)**: Question rows are unclickable static table rows, quizzes do not persist to Supabase, or Auth/Settings controls are non-functional placeholders.

---

## Dimension D: No Promotional Slop & Strict Brand Hygiene (Weight: 15% — Hard Floor: 5/5)

User-facing copy must read like a cohesive product (`Exile`), never a hackathon tech-stack advertisement:
- **Forbidden Slop**:
  - Never puts `"Supabase"`, `"Supabase Cloud"`, `"Powered by Supabase"`, or infrastructure vendor promotions in user-facing titles, subtitles, badges, or footers in `src/app/` or `src/components/`.
  - Never uses legacy `"exile.org"` or `"exile-org"` branding in user-facing UI; the brand is strictly **`Exile`**.
- **Score 5 (Frontier — Required)**: Brand is strictly `Exile` across all pages, headers, metadata, and footers; zero vendor/infrastructure promotional text in user-facing JSX.
- **Score 3 (Unacceptable)**: Brand is `Exile`, but footer or status badges still mention `Supabase Cloud` or database vendor names to end users.
- **Score 1 (Sloppy / Hard Fail)**: Contains `exile.org`, `exile-org`, or `Supabase` in user-facing JSX text.
