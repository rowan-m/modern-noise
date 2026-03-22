## 2024-05-17 - Keyboard Accessibility on Custom Styled Inputs

**Learning:** Custom UI elements like sliders (styled with `appearance: none`) and buttons with extensive custom styling often lose their native focus rings, leading to broken keyboard navigation and poor accessibility for users relying on keyboard interaction.
**Action:** Always verify keyboard navigation for custom inputs and add explicit `:focus-visible` styling (e.g., `outline: 3px solid var(--accent-color)`) with an appropriate `outline-offset` to ensure interactive elements are clearly highlighted without breaking mouse-click aesthetics.
