## 2024-05-24 - Focus States for Custom Controls

**Learning:** Custom UI elements like sliders or styled buttons often lack native focus rings. Relying only on pointer interactions excludes keyboard users, making the app feel broken or inaccessible.
**Action:** Always ensure that every interactive element has a clear `:focus-visible` state using `outline` and `outline-offset`, especially when standard styling has been removed (e.g., via `appearance: none`).
