## 2024-05-18 - [Add Security Headers to Firebase Config]
**Vulnerability:** Missing security headers, specifically Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, and Strict-Transport-Security. This left the application vulnerable to XSS, clickjacking, and mime-sniffing.
**Learning:** The application is a static Firebase web app, so security headers need to be configured in `firebase.json` under `hosting.headers`. The application uses Google Fonts, so the CSP must explicitly permit external resources from `https://fonts.googleapis.com` (style-src) and `https://fonts.gstatic.com` (font-src).
**Prevention:** Always configure comprehensive security headers for static applications, tailoring the CSP to the specific external resources required.
