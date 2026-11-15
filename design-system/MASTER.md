# DESIGN SYSTEM MASTER — LiChick by LUCUIH (UI/UX Pro Max)

> **Generated via `ui-ux-pro-max` Reasoning Engine**
> - **Categories Matched**: `Restaurant/Food Service (#36)` × `E-Commerce (#3)` × `Bento Box Grid (#39)` × `Tactile Digital (#60)`
> - **Landing Page Pattern**: `Hero-Centric + Bento Showcase + Social Proof + Conversion Funnel`
> - **Dashboard Pattern**: `Sales Intelligence (#37) + Real-Time Kitchen Monitoring (#31)`

---

## 1. Design Tokens & Color Palette (Warm Culinary & Urgency)

| Token | Hex | Tailwind Utility | Purpose & Reasoning (`colors.csv` #3 & #36) |
| :--- | :--- | :--- | :--- |
| **Primary Brand** | `#FF5500` | `bg-brand-orange` / `text-brand-orange` | Appetizing crispy orange; triggers hunger & high CTA conversion contrast |
| **Primary Hover** | `#E04800` | `hover:bg-brand-orangeHover` | Tactile depth state on hover/active |
| **Secondary Cheese** | `#FFB800` | `bg-brand-amber` / `text-brand-amber` | Warm melted cheddar gold for badges, stars & highlights |
| **Surface Base** | `#F8F6F0` | `bg-brand-paper` | Warm Kraft paper background; avoids sterile hospital white |
| **Card Surface** | `#FFFFFF` | `bg-white` | Pure high-contrast surface for food photography & bento cards |
| **Elevated Dark** | `#141416` | `bg-brand-dark` / `text-brand-dark` | Deep espresso/charcoal (`14.8:1` WCAG AAA contrast on cream/white) |
| **Urgency / Low Quota**| `#EF4444` | `bg-red-500` / `text-red-600` | Scarcity trigger when batch quota drops below 20% ($\le 10$ of 50 portions) |
| **Verified / Safe** | `#10B981` | `bg-emerald-500` / `text-emerald-600` | Kitchen active status, verified payment & halal assurance |

---

## 2. Typography System (`Poppins` Unified Scale)

- **Font Family**: `Poppins` (Weights: `400`, `500`, `600`, `700`, `800`) loaded with `display=swap` and preconnect hints.
- **Modular Type Scale (`ux-guidelines.csv` #67, #72, #74)**:
  - **Hero Display**: `clamp(2rem, 4.5vw, 3.5rem)` (`font-extrabold tracking-tight leading-[1.1]`)
  - **Section Heading (H2)**: `1.5rem – 2rem` (`font-bold tracking-tight`)
  - **Product Title (H3)**: `1.375rem – 1.5rem` (`font-extrabold`)
  - **Body Copy**: Minimum `16px` (`text-base leading-relaxed`) on mobile to prevent zoom/squinting (`ux-guidelines.csv` #67).
  - **Micro-badges / Metadata**: `12px` (`text-xs font-semibold uppercase tracking-wider`).

---

## 3. Interaction, Motion & Tactile Physics (`styles.csv` #16 & #60)

1. **Spring Press Deformation**:
   - Every interactive button uses `active:scale-95 transition-transform duration-150 ease-[cubic-bezier(0.34,1.56,0.64,1)]`.
2. **Mobile Haptic Feedback (`ux-guidelines.csv` #27)**:
   - Adding/subtracting portions and copying bank account numbers trigger subtle tactile vibration `if (navigator.vibrate) navigator.vibrate(12);`.
3. **Touch Target Ergonomics (`ux-guidelines.csv` #22, #23, #66)**:
   - All buttons, steppers (`+`/`-`), batch cards, and sauce pills maintain a minimum `44px × 44px` hit target (`min-h-[44px] min-w-[44px]`) with `gap-2` (`8px+`) spacing.
4. **Accessibility & Web Interface Rules (`web-interface.csv` #1–#30)**:
   - `focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2` on all interactive controls.
   - `aria-label` on all icon-only buttons (`+`, `-`, close drawer, copy rekening).
   - `aria-live="polite"` on dynamic cart totals and remaining quota counters.
   - `@media (prefers-reduced-motion: reduce)` respected globally.

---

## 4. Anti-Patterns Strictly Prohibited (`ui-reasoning.csv`)
- ❌ No generic AI purple/cyan/pink blurred blobs.
- ❌ No emojis used as structural UI icons (all icons are crisp 24×24 Lucide SVGs with explicit `width` & `height`).
- ❌ No `transition-all duration-1000` sluggish animations.
- ❌ No hidden fees or multi-page checkout friction (single-screen bottom-sheet drawer + 1-click WhatsApp fallback).
