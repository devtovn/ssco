# CloudFlare CDN Setup (Task 21.2)

1. Add your domain to CloudFlare and update nameservers at the registrar.
2. DNS records:
   - `A` / `CNAME` for `@` and `www` pointing to your production server or load balancer.
3. SSL/TLS mode: **Full (strict)** with origin certificate or Let's Encrypt on the server.
4. Cache rules:
   - Cache images (`/static`, product CDN URLs) — Edge TTL 1 month.
   - Bypass cache for `/api/*`.
5. Page rules (or Cache Rules):
   - `*example.com/api/*` — Cache Level: Bypass.
   - `*example.com/_next/static/*` — Cache Level: Cache Everything.
6. Enable Brotli and HTTP/3 for faster mobile delivery.
7. Verify cache hit rate in CloudFlare Analytics after 24h.
