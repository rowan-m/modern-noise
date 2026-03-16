## 2024-05-24 - Firebase Static App Security Headers
**Vulnerability:** Missing fundamental web security headers like CSP, X-Frame-Options, X-Content-Type-Options.
**Learning:** For a static app deployed on Firebase Hosting, security headers must be declared in the `firebase.json`'s `hosting.headers` configuration instead of relying on backend logic. A specific Content Security Policy (CSP) setup is required for fonts loaded from Google (`fonts.googleapis.com` and `fonts.gstatic.com`).
**Prevention:** Implement comprehensive security headers under `hosting.headers` in `firebase.json` to leverage Firebase Hosting security configurations and block XSS/framing attacks. Ensure CSP properly allows needed external assets.
