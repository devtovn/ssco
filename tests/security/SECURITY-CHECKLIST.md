# Security Testing Checklist (Task 20.6)

Run before production release:

- [ ] OWASP ZAP baseline scan against staging URL
- [ ] SQL injection probes on all query/body parameters (expect 400/404, never 500 with SQL errors)
- [ ] XSS payloads in search keyword and article content fields
- [ ] JWT expiration and invalid signature rejection on `/api/admin/*`
- [ ] Rate limit verification on `/api/search` and `/api/auth`
- [ ] CORS: only `FRONTEND_URL` origin allowed
- [ ] HTTPS redirect at reverse proxy / CloudFlare

Automated in CI: backend unit tests, ESLint, TypeScript strict mode.
