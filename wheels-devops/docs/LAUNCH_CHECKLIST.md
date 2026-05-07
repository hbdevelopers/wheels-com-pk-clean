# wheels.com.pk — Production Launch Checklist
# Complete every item before going live

---

## 🔐 SECURITY & AUTH

- [ ] JWT_SECRET is at least 64 characters of random entropy (`openssl rand -hex 32`)
- [ ] JWT_REFRESH_SECRET is different from JWT_SECRET
- [ ] OTP rate limiting tested (5 OTPs/hour per phone, verified in Redis)
- [ ] All `.env` files excluded from git (`.gitignore` confirmed)
- [ ] No hardcoded credentials in any source file (`git grep -i "password\|secret\|apikey" src/`)
- [ ] Admin panel IP whitelist enabled in Nginx config
- [ ] CORS origins set to production domains only (no `*`)
- [ ] Helmet.js headers verified with [securityheaders.com](https://securityheaders.com)
- [ ] SSL certificate valid, HSTS enabled, grade A on SSL Labs
- [ ] PostgreSQL not exposed to public internet (only accessible from Docker network)
- [ ] Redis password set and not exposed publicly
- [ ] OTP SMS provider tested with real Pakistan number

---

## 🗄️ DATABASE

- [ ] Migrations run cleanly on a fresh database: `npm run migration:run`
- [ ] All indexes created and verified: `\d+ vehicles` in psql
- [ ] Connection pool size tuned (max: 20 for 1 backend instance)
- [ ] Automated backups configured (daily, 30-day retention minimum)
- [ ] Backup restore tested — confirm you can restore from backup
- [ ] `pg_trgm` extension created for fuzzy search
- [ ] Seed data loads without errors: `psql -f seeds/002_seed_data.sql`
- [ ] All test account phones work with OTP flow
- [ ] Soft delete working (deleted_at populated, not hard deleted)

---

## 🚀 BACKEND API

- [ ] All endpoints return correct HTTP status codes
- [ ] Validation rejects invalid Pakistan phone numbers
- [ ] Image upload works: POST /vehicles/:id/images with 20 JPEGs
- [ ] Images optimized to WebP, thumbnails generated
- [ ] R2 bucket has public read access for CDN URLs
- [ ] AI price estimator responds within 3 seconds
- [ ] AI fraud detection runs on listing creation
- [ ] WebSocket chat connects, messages deliver in real-time
- [ ] WebSocket auction bid updates broadcast to all watchers
- [ ] Push notifications deliver to Expo test device
- [ ] JazzCash sandbox payment completes successfully
- [ ] EasyPaisa sandbox payment completes successfully
- [ ] Rate limiting returns 429 after threshold
- [ ] Health endpoint returns 200: GET /api/v1/health
- [ ] Swagger docs accessible in staging: /api/docs
- [ ] All error responses use consistent `{ statusCode, message, error }` format

---

## 📱 MOBILE APP

- [ ] Expo EAS build completes for Android and iOS
- [ ] App loads in under 2 seconds on 4G connection (LTE, Pakistan)
- [ ] OTP login works end-to-end on real device
- [ ] Search returns results with all filters applied correctly
- [ ] Photo upload from camera roll works (request permissions)
- [ ] Chat messages send and receive in real-time on two devices
- [ ] Push notifications received when app is in background
- [ ] Deep links open correct screens: `wheels://listing/[id]`
- [ ] App works offline gracefully (shows cached data or error message)
- [ ] Urdu text renders correctly (RTL layout where needed)
- [ ] Finance calculator gives accurate PKR monthly estimates
- [ ] Share listing generates shareable card/link
- [ ] No crashes on Android 10+ and iOS 14+
- [ ] App size under 50MB (Android APK), 100MB (iOS IPA)

---

## 🔔 NOTIFICATIONS

- [ ] Expo push token saved to DB on login
- [ ] Push notification delivered for: new message, offer, price drop, listing approved
- [ ] Notification deep links navigate to correct screen
- [ ] Welcome email sends on registration
- [ ] Listing approved email sends when admin approves
- [ ] Finance lead email sent to partner banks
- [ ] `DeviceNotRegistered` tokens removed from DB automatically
- [ ] Urdu push notifications render correctly on device

---

## 💳 PAYMENTS

- [ ] JazzCash production credentials received and configured
- [ ] EasyPaisa production credentials received and configured
- [ ] Payment success redirects to correct screen
- [ ] Payment failure shows user-friendly message (not raw error)
- [ ] Webhook/callback from payment gateway verified with HMAC
- [ ] Transaction recorded in `transactions` table on success
- [ ] Listing boost activates immediately after successful payment
- [ ] Refund process documented (manual for now)

---

## 🏗️ INFRASTRUCTURE

- [ ] Docker compose runs cleanly: `docker compose up --build`
- [ ] All containers healthy: `docker compose ps`
- [ ] Nginx SSL works: `curl -I https://api.wheels.com.pk/api/v1/health`
- [ ] WebSocket works through Nginx (upgrade headers configured)
- [ ] GitHub Actions pipeline passes all jobs
- [ ] Deployment SSH key added to VPS `authorized_keys`
- [ ] VPS has minimum 4GB RAM, 2 vCPUs (recommended: 8GB, 4 vCPUs)
- [ ] Disk space: minimum 50GB, alerting at 80% usage
- [ ] Certbot SSL auto-renewal cron job active: `certbot renew --dry-run`
- [ ] Log rotation configured (Docker JSON logging with max 10MB x 5 files)
- [ ] VPS firewall: only ports 80, 443, 22 (SSH) open to public

---

## 📊 MONITORING & ANALYTICS

- [ ] Sentry (or similar) error tracking integrated in backend
- [ ] Sentry integrated in mobile app (Expo Sentry)
- [ ] Server CPU/RAM/Disk monitoring (UptimeRobot, Grafana, or similar)
- [ ] Uptime monitoring with alerts to admin Slack/WhatsApp
- [ ] Database slow query logging enabled (`log_min_duration_statement = 500`)
- [ ] Redis memory usage monitored
- [ ] Admin dashboard showing live user/listing counts

---

## 🌐 SEO & GROWTH

- [ ] `sitemap.xml` generated for all active listings
- [ ] `robots.txt` configured correctly
- [ ] OG meta tags on listing pages (title, image, price)
- [ ] Deep link schema registered in app manifest
- [ ] Share listing generates preview image with car photo + price
- [ ] Referral codes working end-to-end
- [ ] Google Analytics / Firebase Analytics connected

---

## 📋 LEGAL & COMPLIANCE

- [ ] Privacy Policy page published at /privacy
- [ ] Terms of Service page published at /terms
- [ ] Cookie consent banner (if serving EU users)
- [ ] CNIC data encrypted at rest (AES-256)
- [ ] Payment card data never stored (handled by gateway)
- [ ] Number plate listing disclaimer added (legally compliant)
- [ ] PEMRA / PTA compliance review done for Pakistan-specific rules

---

## 🧪 FINAL TESTING (Staging → Production)

- [ ] Full user journey tested: Register → Post Listing → Receive Chat → Accept Offer
- [ ] Full dealer journey: Apply → Approved → Post 5 listings → Receive lead
- [ ] Full auction journey: Create → Go live → Bids → End → Winner notified
- [ ] Finance lead submitted and received by test partner email
- [ ] Admin can approve/reject listing, user notified via push
- [ ] Admin can block user, blocked user gets 401 on next request
- [ ] Load test with 100 concurrent users (use k6 or Apache Bench)
- [ ] Penetration test: SQL injection, XSS, auth bypass attempts

---

## 🚀 LAUNCH DAY

- [ ] DNS records pointing to production VPS
- [ ] `A` record: wheels.com.pk → VPS IP
- [ ] `CNAME` records: api, admin, www → wheels.com.pk
- [ ] CDN configured for R2 (cdn.wheels.com.pk)
- [ ] App Store / Play Store listings published and approved
- [ ] Social media accounts created (@wheelscomPK)
- [ ] WhatsApp Business number registered
- [ ] Launch announcement prepared (social + PakWheels forum)
- [ ] Admin team briefed on moderation workflow
- [ ] On-call support rotation for launch week

---

## 📞 EMERGENCY CONTACTS

| Service        | Account          | Contact                  |
|----------------|------------------|--------------------------|
| VPS (Hostinger/DigitalOcean) | admin@wheels.com.pk | support portal |
| Cloudflare R2  | admin@wheels.com.pk | dash.cloudflare.com |
| Twilio SMS     | admin@wheels.com.pk | console.twilio.com |
| OpenAI         | admin@wheels.com.pk | platform.openai.com |
| JazzCash       | Merchant ID on file | 051-111-124-924 |
| EasyPaisa      | Store ID on file   | 0311-1825823 |

---

**Signed off by:** _________________________ **Date:** _____________

> ✅ All items checked = Ready to launch wheels.com.pk
