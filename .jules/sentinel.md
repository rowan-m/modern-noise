## 2025-02-14 - Inline Script Validation with CSP in Firebase

**Vulnerability:** Weak or non-existent Content Security Policy (CSP) allowed potentially untrusted scripts (e.g. via 'unsafe-inline').
**Learning:** Calculating a SHA-256 hash for inline scripts in a Content Security Policy (CSP) must strictly include all exact whitespace and newlines present between the `<script>` tags, or the browser will reject it as a CSP violation. Additionally, Firebase applications require `connect-src` allowing `https://*.googleapis.com https://*.firebaseio.com` to prevent breaking core functionality when enforcing `default-src 'self'`.
**Prevention:** Always use SHA-256 hashes for inline scripts rather than `'unsafe-inline'` and verify hash accuracy based on exact script contents. Always include required Firebase connection origins in the CSP `connect-src` directive.
