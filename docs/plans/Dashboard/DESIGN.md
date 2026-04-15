# Design System Strategy: The Focused Academic

## 1. Overview & Creative North Star
The "Saber 11 Simulator" requires more than a standard testing interface; it demands an environment that fosters "Deep Cognitive Flow." Our Creative North Star is **The Digital Curator**. 

This system moves away from the cluttered, high-anxiety aesthetic of traditional examination software. Instead, it adopts a high-end editorial approach. We break the "template" look through **intentional asymmetry**, where content is often offset to allow for generous breathing room, and **tonal depth**, where hierarchy is communicated through soft shifts in background values rather than harsh lines. The goal is a "Zen-like" focus that treats every question like a piece of curated content.

---

## 2. Colors & Surface Philosophy
We utilize a sophisticated palette that prioritizes legibility and psychological calm.

### Color Roles
- **Primary (`#004ac6`):** Reserved for the "Path of Action"—the primary journey of the student.
- **Secondary (`#505f76`):** Used for meta-information and navigational context.
- **Tertiary/Accent (`#006242`):** Exclusively for "Success States" and progress indicators. This reinforces a positive feedback loop.
- **Neutral/Surface:** A tiered system of cool greys to create depth.

### The "No-Line" Rule
**Prohibit 1px solid borders for sectioning.** To achieve a premium, modern feel, boundaries must be defined solely through background color shifts. For example, a `surface_container_low` section should sit on a `surface` background. If you feel the need for a line, use a spacing increment instead.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers, like stacked sheets of fine, heavy-weight paper. 
- **Layer 0 (Base):** `surface` (#f7f9fb)
- **Layer 1 (Sections):** `surface_container_low` (#f2f4f6)
- **Layer 2 (Interactive Cards):** `surface_container_lowest` (#ffffff) 

### The "Glass & Gradient" Rule
To add "soul" to the minimalist aesthetic:
- **Hero Elements:** Use subtle linear gradients transitioning from `primary` (#004ac6) to `primary_container` (#2563eb) at a 135° angle.
- **Floating Overlays:** Use `surface_container_lowest` with a 80% opacity and a `24px` backdrop blur to create a "frosted glass" effect for navigation bars or floating action panels.

---

## 3. Typography: Editorial Authority
We use **Inter** not as a system font, but as a brand anchor. The hierarchy is designed to feel like a high-end educational journal.

- **Display & Headlines:** Use `display-md` for landing moments. These should be tight-tracked (-0.02em) and bold to command authority.
- **Body Text:** Use `body-lg` (1rem) for questions. This is the most critical element. Ensure a line height of `1.6` to prevent cognitive fatigue during long reading sessions.
- **Labels:** Use `label-md` in all-caps with increased letter spacing (+0.05em) for category tags (e.g., "MATHEMATICS," "CRITICAL READING") to create a clear distinction from narrative text.

---

## 4. Elevation & Depth
Depth in this system is achieved through **Tonal Layering** rather than traditional structural shadows.

- **The Layering Principle:** Place a `surface_container_lowest` (#ffffff) card on a `surface_container_low` (#f2f4f6) background. This creates a natural "lift" that feels integrated into the architecture.
- **Ambient Shadows:** When a component must float (like a modal or a floating action button), use an extra-diffused shadow: `box-shadow: 0 12px 40px rgba(25, 28, 30, 0.06)`. Note the low opacity; it should be felt, not seen.
- **The "Ghost Border":** If a border is required for accessibility (e.g., input focus), use `outline_variant` at 20% opacity. Never use 100% opaque borders.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `xl` (1.5rem) rounded corners. White text (`on_primary`).
- **Secondary:** `surface_container_high` background with `on_surface` text. No border.
- **Tertiary:** Transparent background, `primary` text. Used for "Cancel" or "Back" actions.

### Cards & Question Blocks
- **Architecture:** Forbid divider lines. Separate the question stem from the options using a 32px vertical gap or a subtle background shift to `surface_container_low`.
- **States:** When an answer is selected, the card should transition to `secondary_container` with a `primary` ghost border (20% opacity).

### Inputs & Fields
- **Styling:** Use `surface_container_highest` for the input field background.
- **Focus State:** Transition the background to `surface_container_lowest` and apply a 2px "Ghost Border" using the `primary` token at 40% opacity.

### Progress Indicators
- **Context:** Use the `tertiary` (Emerald) scale. 
- **Visual:** Instead of a thin line, use a thick, `lg` rounded track. The unfilled portion should be `surface_container_high`.

---

## 6. Do's and Don'ts

### Do:
- **Use Asymmetric Whitespace:** Allow one side of a container to have more padding than the other to create an "editorial" feel.
- **Embrace the "White-on-Gray" Look:** Place white cards on a light gray background for a crisp, high-end feel.
- **Use Large Radii:** Stick to `lg` (1rem) and `xl` (1.5rem) for main containers to soften the educational experience.

### Don't:
- **Don't use 1px Dividers:** They clutter the interface. Use spacing or color shifts instead.
- **Don't use Pure Black:** Always use `on_surface` (#191c1e) for text to maintain a premium, softened contrast.
- **Don't Over-Elevate:** Avoid stacking more than three layers of depth. Keep the interface relatively flat to ensure the user feels in control.
- **Don't use "Standard" Drop Shadows:** If it looks like a default CSS shadow, it is too heavy. Lighten it until it barely registers.