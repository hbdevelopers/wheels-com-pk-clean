# wheels.com.pk 🚗

Pakistan's Smartest Automotive Marketplace — buy, sell, auction vehicles with AI-powered pricing, fraud detection, and real-time chat.

## Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo SDK 51 (iOS + Android) |
| Backend | Node.js + NestJS + TypeScript |
| Database | PostgreSQL 15 + Redis 7 |
| Storage | Cloudflare R2 (CDN-backed) |
| AI | OpenAI GPT-4o (price estimation, fraud, descriptions) |
| Payments | JazzCash + EasyPaisa |
| Notifications | Expo Push + Resend Email |
| DevOps | Docker + GitHub Actions + Nginx |

## Quick Start

### 1. Backend
```bash
cd backend
cp .env.example .env.local
# Fill in DB, Redis, JWT, OpenAI, R2, SMS credentials
npm install
npm run start:dev
```

### 2. Mobile
```bash
cd mobile
npm install
npx expo start
```

### 3. Full Stack (Docker)
```bash
cd docker
docker compose -f docker-compose.prod.yml up -d
# Then run migrations:
docker compose exec backend node dist/database/run-migrations.js
```

## Project Structure

```
wheels.com.pk/
├── backend/          # NestJS API server
│   ├── src/
│   │   ├── modules/  # auth, vehicles, ai, chat, auctions, dealers...
│   │   └── common/   # guards, middleware, filters
│   ├── Dockerfile
│   └── package.json
├── mobile/           # React Native Expo app
│   ├── app/          # Expo Router screens
│   ├── services/     # API client, WebSocket, notifications
│   ├── store/        # Zustand state management
│   ├── constants/    # theme, cities, makes
│   └── i18n/         # English + Urdu translations
├── admin/            # Next.js admin panel
│   └── app/dashboard/
└── wheels-devops/
    ├── nginx/        # Production Nginx config with SSL
    ├── .github/      # CI/CD GitHub Actions
    ├── db/seeds/     # Seed data + test accounts
    └── docs/         # Deployment guide + Launch checklist
```

## Test Accounts (Development)

| Role | Phone | Notes |
|------|-------|-------|
| Admin | +923001111111 | Full access |
| Seller | +923009876543 | Ahmed Raza, Lahore |
| Seller 2 | +923331234567 | Bilal Hassan, Karachi |
| Buyer | +923215556666 | Sara Khan, Islamabad |
| Dealer | +922131234567 | AutoMax Karachi |

In development, OTP is printed to the backend console instead of sending SMS.

## Key Features

- 🤖 **AI Price Estimator** — GPT-4o analyzes 1,000+ comparable listings
- 🛡️ **Fraud Detection** — Automatic risk scoring on every listing
- 💬 **Real-time Chat** — WebSocket messaging with offer system
- 🔨 **Live Auctions** — Race-condition-safe bidding engine
- 📱 **Pakistan OTP** — Works with Twilio, Africa's Talking, Jazz SMS
- 💳 **Local Payments** — JazzCash + EasyPaisa with HMAC verification
- 🌐 **Bilingual** — Full English + Urdu (اردو) UI support
- 🔔 **Smart Notifications** — Expo push with bilingual templates

## Environment Variables

See `backend/.env.example` for all required variables.

## Deployment

See `wheels-devops/docs/DEPLOYMENT.md` for full production setup guide.

## Launch Checklist

See `wheels-devops/docs/LAUNCH_CHECKLIST.md` — 70+ items to verify before go-live.

---

Built with ❤️ for Pakistan's automotive market.
