## 2024-05-18 - Missing native tooltips on icon-only buttons
**Learning:** Icon-only buttons with `aria-label`s are great for screen readers, but sighted users still need visual hints for what the icon represents, especially if the icons are non-standard (e.g. 'W' for White noise, or '🛠' for Building noise). Relying on just `aria-label` hurts the user experience for users who don't use screen readers but might not intuitively understand the icons.
**Action:** Always complement `aria-label`s with `title` attributes on icon-only or initial-only buttons so native browser tooltips can clarify the button's action on hover.

## 2024-05-18 - Missing keyboard focus states
**Learning:** Interactive elements like `.noise-button`s and custom range inputs (`#volume-slider`) didn't have explicit focus states. When users tabbed through the app, there was no visual indication of which button was focused.
**Action:** Always implement `:focus-visible` styles on interactive elements using a color that contrasts well with the background (in this case, the existing orange `rgb(220, 84, 47)`) to ensure smooth and obvious keyboard navigation.