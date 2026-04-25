# Saber 11 Design System

**Product:** Simulador Saber 11 — plataforma satelital de preparación para el examen de Estado colombiano (ICFES).  
**Version:** 4.2.0-Scholar · © 2026 Víctor Puello

---

## Product Context

The Simulador Saber 11 is a microservices platform that **integrates with Kampus** (the institutional software deployed at `kampus.ieplayasdelviento.edu.co`) and reuses its existing users — students, teachers, and administrators — without duplicating them.

### Core Purpose
Prepare students for Colombia's national Saber 11 exam by generating questions that follow the exact ICFES Evidence-Centered Design methodology. The system evaluates analytical and contextual reasoning, not rote memorization.

### Context Components and Structure
The design system distinguishes between:
- visual context components
- pedagogical structure

The visual catalog now includes an explicit `Texto base simple` component for the current text-only case. Separately, the product can group up to 3 subpreguntas under a shared context using the `Bloque de preguntas` structure.

### Three User Roles
| Role | Key Flows |
|---|---|
| **Student** | Adaptive diagnostic → personalized weekly study plan → practice sessions → view results |
| **Teacher** | Create/review questions, monitor student analytics |
| **Admin** | Institution-level aggregate reports, question bank management |

### Five Exam Areas
`MAT` Matemáticas · `LC` Lectura Crítica · `SC` Sociales y Ciudadanas · `CN` Ciencias Naturales · `ING` Inglés

### Tech Stack
- Frontend: React 18 + Vite + TypeScript + Tailwind CSS v4
- Icons: Material Symbols Outlined (Google)
- Backend: Node.js gateway + Python FastAPI microservices (Docker)

---

## Sources

| Resource | Location / Link |
|---|---|
| Codebase | GitHub: `victorpuello/saber` (branch: `main`) |
| Kampus integration | Deployed at `kampus.ieplayasdelviento.edu.co` |
| Architecture doc | `docs/arquitectura_simulador_saber11.md` in repo |
| Visual strategy | `docs/estrategia_imagenes_saber11.md` in repo |

---

## Content Fundamentals

### Language & Tone
- **Language:** Spanish (Colombia). UI labels and copy are in Spanish; some internal dev strings remain in English.
- **Register:** Formal but warm. Uses **usted** (not tú) — consistent with the institutional/academic context.
- **Casing:** Labels use `UPPERCASE TRACKING` for metadata tags and section headers (e.g. `DIAGNÓSTICO INICIAL`, `MATERIAL DE LECTURA`). Main text uses sentence case.
- **Verb mood:** Commands use second-person usted forms: *"Iniciar sesión"*, *"Ingresar tu contraseña"*.
- **Error messages:** Specific and instructive, never vague. E.g. *"Usa un identificador válido: letras, números, punto, guion o arroba."*
- **No emoji.** The product uses Material Symbols icons exclusively — no emoji, not even in UI states.
- **Numbers:** Colombian locale (`es-CO`) — uses `.` as thousands separator and `,` for decimals when shown.

### Example Copy
| Context | Text |
|---|---|
| Hero tagline | *"El dominio académico comienza con una práctica disciplinada."* |
| Hero sub | *"Accede a una experiencia curada de aprendizaje diseñada para optimizar tu flujo cognitivo y elevar tus resultados."* |
| Auth badge | `AUTENTICACIÓN KAMPUS` |
| Loading | *"Preparando tu diagnóstico…"* |
| Success | *"¡Diagnóstico completado!"* |
| Version footer | `Versión 4.2.0-Scholar · © 2026 Víctor Puello. Todos los derechos reservados.` |

### Vibe
Academic precision + modern digital clarity. No startup-casual. No bureaucratic stiffness. Think: a well-designed university exam tool that takes the student's success seriously.

---

## Visual Foundations

### Color System
Follows a **Material Design 3-inspired token model**. All colors are defined as CSS custom properties.

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#004ac6` | Brand blue — CTAs, active states, icons |
| `--color-primary-container` | `#2563eb` | Gradient end, secondary blue |
| `--color-primary-fixed` | `#dbe1ff` | Light blue tint — info banners |
| `--color-on-primary-fixed` | `#00174b` | Text on light blue |
| `--color-secondary` | `#505f76` | Muted text, icons, labels |
| `--color-surface` | `#f7f9fb` | Page background |
| `--color-background` | `#f7f9fb` | Same as surface |
| `--color-on-surface` | `#191c1e` | Primary text |
| `--color-surface-container-lowest` | `#ffffff` | Cards, input fields |
| `--color-surface-container-low` | `#f2f4f6` | Subtle panels |
| `--color-surface-container` | `#eceef0` | Default container |
| `--color-surface-container-high` | `#e6e8ea` | Hover states, dividers |
| `--color-surface-container-highest` | `#e0e3e5` | Input default bg |
| `--color-on-surface-variant` | `#434655` | Secondary text on surface |
| `--color-outline` | `#737686` | Borders, placeholder text |
| `--color-outline-variant` | `#c3c6d7` | Subtle dividers |
| `--color-error` | `#ba1a1a` | Error text |
| `--color-error-container` | `#ffdad6` | Error bg |
| `--color-on-error-container` | `#93000a` | Error text on container |
| `--color-inverse-surface` | `#2d3133` | Dark tooltips |
| `--color-inverse-on-surface` | `#eff1f3` | Text on dark |

**Subject area color coding** (semantic, not in CSS vars):
- MAT → blue-50 / blue-700
- LC → violet-50 / violet-700
- ING → amber-50 / amber-700
- CN → emerald-50 / emerald-700
- SC → rose-50 / rose-700

**Status colors:**
- APROBADO → emerald-100 / emerald-700
- PENDIENTE → amber-100 / amber-700
- BORRADOR → slate-100 / slate-600

### Typography
Single typeface: **Inter** (Google Fonts). Three semantic roles: `--font-headline`, `--font-body`, `--font-label` — all Inter.

| Scale | Size | Weight | Tracking | Usage |
|---|---|---|---|---|
| Hero number | 6xl–7xl | black (900) | tighter | Dashboard metric values |
| Headline | 3xl–4xl | extrabold–black | tight | Page headings, hero text |
| Sub-headline | xl–2xl | bold | tight | Section titles |
| Body | base–lg | regular–medium | normal | Reading context, descriptions |
| Label | xs–sm | semibold–bold | widest (0.32em) | UPPERCASE metadata tags |
| Mono | — | bold | tight | Timer, code values (font-mono) |

### Spacing & Radius
```
--radius-sm: 0.5rem    (8px)   — focus rings, small chips
--radius-md: 0.75rem   (12px)  — input fields, small cards
--radius-lg: 1rem      (16px)  — cards
--radius-xl: 1.5rem    (24px)  — panels
rounded-2xl → 1rem              — buttons, option items
rounded-3xl → 1.5rem            — metric cards, table container
rounded-4xl → 2rem              — hero cards, reading pane, question pane
```

### Shadows & Elevation
```
shadow-scholar-card: 0 24px 55px -30px rgb(0 74 198 / 35%)  — CTAs, hero card
shadow-lg shadow-primary/10                                   — dashboard heroes
shadow-[0_12px_40px_rgba(25,28,30,0.05)]                    — table container
shadow-[0_12px_40px_rgba(0,74,198,0.25)]                    — gradient buttons
```

### Backgrounds & Patterns
- **Page:** flat `#f7f9fb`
- **Sidebar:** `bg-slate-50`
- **Hero panels:** `scholar-gradient` — `linear-gradient(135deg, #004ac6 → #2563eb)` with subtle circle accents (white/5 opacity)
- **Login left panel:** gradient + white 10% opacity SVG grid pattern overlay
- **Glass panel:** `background: rgb(255 255 255 / 82%); backdrop-filter: blur(24px)` — used on header and loading state
- **No textures, no illustrations, no full-bleed images** in the main app (one hero image on login page only)

### Animations
```
login-fade-in  450ms cubic-bezier(0.2, 0.7, 0.2, 1)    — opacity 0→1
login-rise-in  550ms cubic-bezier(0.16, 1, 0.3, 1)      — opacity+translateY 22px→0 (spring feel)
login-pulse    3s ease-in-out infinite                   — subtle scale 1→1.01 breathe
```
- Transitions on interactive elements: `transition-all`, `transition-colors`, `transition-opacity`
- Duration: implicit Tailwind defaults (150ms) for most hover states
- Progress bars: `transition-all duration-500` for width changes

### Interactive States
| State | Treatment |
|---|---|
| Hover button | `hover:scale-[1.01]` or `hover:opacity-90` |
| Active/press button | `active:scale-[0.99]` or `active:scale-95` |
| Hover nav item | `hover:bg-slate-200/50`, text color shift |
| Active nav item | `border-r-4 border-primary font-bold text-primary` |
| Focus | 2px solid primary, offset 2px, border-radius 0.5rem — keyboard only |
| Hover option card | `hover:bg-white hover:ring-2 hover:ring-primary/20` |
| Selected option | `bg-[#d0e1fb] ring-2 ring-primary/20` |
| Disabled | `disabled:opacity-65` or `disabled:opacity-40` |

### Cards & Containers
- Standard card: `rounded-3xl bg-surface-container-lowest shadow-[...]` with `border border-outline-variant/10`
- Hero card: `rounded-4xl bg-linear-to-br from-primary to-primary-container text-white`
- Table: `rounded-3xl bg-surface-container-lowest overflow-hidden`
- Input: `rounded-xl bg-surface-container-highest px-12 py-4 border-transparent focus:border-primary/30`

### Corner Radii (summary)
No sharp corners anywhere. The scale is: 8 → 12 → 16 → 24 → 32px. Buttons use 12px (rounded-xl). Small chips use 9999px (rounded-full).

### Color Vibe of Imagery
Cool-neutral academic. The one hero image (login) shows a calm workspace with natural light — no warm filters, no grain, no high contrast.

### Use of Transparency & Blur
- Glass header: `bg-white/80 backdrop-blur-xl`
- Mobile nav: `bg-white/90 backdrop-blur-md`
- Gradient overlays: `bg-white/5`, `bg-white/15`, `bg-white/20`
- Focus rings: `ring-primary/35`

---

## Iconography

**Icon system:** [Material Symbols Outlined](https://fonts.google.com/icons) loaded from Google Fonts CDN.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
```

**Default variation settings:**
```css
.material-symbols-outlined {
  font-variation-settings: "FILL" 0, "wght" 420, "GRAD" 0, "opsz" 24;
  line-height: 1;
}
```

**Filled variant** (used for brand icon and key UI icons):
```jsx
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
  auto_stories
</span>
```

**Key icons used in the app:**
| Icon | Usage |
|---|---|
| `auto_stories` (FILL 1) | Brand logo / product identity |
| `dashboard` | Nav: Dashboard |
| `analytics` | Nav: Diagnóstico |
| `military_tech` | Nav: Results |
| `person` | Login username field |
| `lock` | Login password field |
| `login` | Submit button |
| `verified_user` (FILL 1) | Kampus auth badge |
| `notifications` | Header action |
| `settings` | Header action |
| `admin_panel_settings` (FILL 1) | Admin hero |
| `quiz` (FILL 1) | Question bank count |
| `pending_actions` (FILL 1) | Pending review badge |
| `progress_activity` | Loading spinner (animate-spin) |
| `error` (FILL 1) | Error state |
| `check_circle` (FILL 1) | Success state |
| `timer` | Exam session timer |
| `help` | Exam session help |
| `chevron_left/right` | Navigation controls |
| `arrow_forward` | CTA buttons |
| `auto_awesome` (FILL 1) | AI-generated question author |
| `zoom_in`, `format_size` | Reading pane tools |

**No PNG icons, no SVG icon sprites, no emoji.** All icons are the Material Symbols font.

**Logos:** No separate logomark SVG file exists in the codebase. The "logo" is composed of the `auto_stories` Material Symbol inside a `rounded-xl bg-primary` container + the text "Saber 11" in font-headline + "Simulador" as an uppercase tracking label.

---

## File Index

```
/ (root)
├── README.md               ← This file
├── colors_and_type.css     ← All CSS custom properties (colors, type, spacing, shadows)
├── SKILL.md                ← Agent skill definition
├── assets/
│   └── logo-block.svg      ← Logo lockup as SVG
├── preview/
│   ├── colors-brand.html       Colors: Brand blue scale
│   ├── colors-surface.html     Colors: Surface / neutral tokens
│   ├── colors-semantic.html    Colors: Error, success, area codes
│   ├── type-scale.html         Type: Headline & body scale
│   ├── type-labels.html        Type: Labels & metadata
│   ├── spacing-radius.html     Spacing: Border radius tokens
│   ├── spacing-shadows.html    Spacing: Shadow system
│   ├── comp-buttons.html       Components: Button variants
│   ├── comp-inputs.html        Components: Form inputs
│   ├── comp-cards.html         Components: Cards (metric, hero)
│   ├── comp-badges.html        Components: Badges & status chips
│   ├── comp-nav.html           Components: Navigation sidebar
│   └── comp-table.html         Components: Data table row
└── ui_kits/
    └── simulador/
        ├── README.md
        └── index.html          ← Full interactive prototype
```
