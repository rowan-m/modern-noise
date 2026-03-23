## 2024-05-24 - Explicit Focus Rings Required for Custom UI Elements

**Learning:** In Modern Noise, custom interactive elements (like the `.noise-button` which uses grid layouts to visually resemble physical buttons, and `#volume-slider` which uses `appearance: none`) lack native browser focus rings. As a result, relying solely on default browser behavior makes keyboard navigation completely invisible and inaccessible to users.
**Action:** Always verify keyboard focus states for custom UI elements and explicitly add `:focus-visible` styles with sufficient `outline` (using the primary accent color `rgb(220, 84, 47)`) and `outline-offset` to ensure clear focus visibility without relying on `box-shadow` which might conflict with existing 3D button styling.
