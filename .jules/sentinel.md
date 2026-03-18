## 2024-05-23 - [Firebase Static App Missing CSP Headers]
**Vulnerability:** The application was missing critical security headers (CSP, X-Frame-Options, Strict-Transport-Security, etc.) in `firebase.json`, leaving it vulnerable to XSS and framing attacks. Inline scripts were not protected by a CSP.
**Learning:** Firebase Hosting does not apply strict security headers by default. Inline scripts used for client-side functionality (like HTTPS redirects) complicate strict CSP rules unless explicitly hashed.
**Prevention:** Always configure the `hosting.headers` array in `firebase.json` for static apps, including a robust `Content-Security-Policy`. For necessary inline scripts, calculate their SHA-256 hash and allowlist them in the CSP instead of using `'unsafe-inline'`.
