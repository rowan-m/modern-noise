## 2024-05-15 - Missing Security Headers in Static App

**Vulnerability:** Static application deployed to Firebase lacked critical security headers including Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options, and X-Content-Type-Options.
**Learning:** Even entirely static sites require HTTP security headers to prevent clickjacking, MIME-type sniffing, and to enforce secure transport and resource loading policies. The inline script must be allowlisted with a SHA hash rather than `'unsafe-inline'` to mitigate XSS risks securely.
**Prevention:** Always configure `hosting.headers` in `firebase.json` for static Firebase deployments to include a secure baseline of HTTP response headers.
