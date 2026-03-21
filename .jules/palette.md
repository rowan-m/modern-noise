## 2024-05-24 - Missing Focus Rings on Custom UI Elements

**Learning:** Custom UI elements like sliders (styled with `appearance: none`) or custom-styled buttons can easily lose their native focus rings, making them invisible to keyboard navigation and failing accessibility requirements.
**Action:** Always ensure every interactive element has an explicit `:focus-visible` state (e.g., using `outline: 2px solid <color>; outline-offset: 2px;`) to maintain keyboard accessibility, especially when customizing native appearance.
