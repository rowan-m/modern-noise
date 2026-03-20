## 2024-03-20 - Ensure Keyboard Accessibility for Custom UI Elements

**Learning:** Custom UI elements like sliders (styled with `appearance: none`) and custom buttons in Modern Noise lose their native browser focus rings. Without explicit styles, these elements become completely invisible to keyboard-only users navigating the interface.
**Action:** Always verify keyboard navigation by applying explicit `:focus-visible` styles with sufficient outline width and `outline-offset` using the primary accent color (`rgb(220, 84, 47)`) to restore an intuitive and accessible focus state.
