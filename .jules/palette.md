## 2026-03-17 - Physical Metaphor Button States

**Learning:** Utilizing `aria-pressed` for both semantic state and visual styling in physical-metaphor UIs creates a cohesive experience for screen reader users and sighted users without needing additional custom CSS classes.
**Action:** When working on tactile, machine-like interfaces, bind visual "pressed" CSS (`transform: scale`, inner `box-shadow`) to the `[aria-pressed="true"]` attribute rather than relying purely on JavaScript class toggles or `:active` states that don't persist.
