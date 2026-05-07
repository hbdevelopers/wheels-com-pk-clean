# wheels.com.pk — Complete Project Architecture

## Tech Stack Decisions

| Layer         | Technology                          | Reason                                      |
|---------------|-------------------------------------|---------------------------------------------|
| Mobile        | React Native + Expo (SDK 51)        | Fastest iteration, OTA updates, single codebase |
| Backend API   | Node.js + NestJS                    | TypeScript, DI, modular, production-proven  |
| Database      | PostgreSQL 15 + Redis 7             | Relational integrity + high-speed cache     |
| File Storage  | Cloudflare R2 (S3-compatible)       | Cheaper egress than AWS S3, CDN built-in    |
| Admin Panel   | Next.js 14 App Router               | SSR for fast dashboards                     |
| Real-time     | Socket.io (WebSocket)               | Chat, live bids, notifications              |
| Auth          | JWT + OTP (Africa's Talking / Twilio) | Pakistan numbers                           |
| Search        | PostgreSQL FTS + pg_trgm            | No extra service needed to start           |
| AI            | OpenAI GPT-4o + Vision API          | Price estimation, fraud, description gen   |
| Payments      | JazzCash SDK + EasyPaisa            | Pakistan's dominant mobile wallets         |
| Email         | Resend.com                          | Developer-friendly transactional email     |
| DevOps        | Docker + GitHub Actions + VPS       | Cost-effective for Pakistan startup scale  |

---

## Folder Structure

```
wheels.com.pk/
├── mobile/                          # React Native Expo App
│   ├── app/                         # Expo Router (file-based routing)
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   ├── otp-verify.tsx
│   │   │   └── onboarding.tsx
│   │   ├── (tabs)/
│   │   │   ├── index.tsx            # Home screen
│   │   │   ├── search.tsx           # Search & browse
│   │   │   ├── sell.tsx             # Post listing
│   │   │   ├── chats.tsx            # Inbox
│   │   │   └── profile.tsx          # User profile
│   │   ├── listing/
│   │   │   ├── [id].tsx             # Listing detail
│   │   │   └── create/
│   │   │       ├── step-1-type.tsx
│   │   │       ├── step-2-details.tsx
│   │   │       ├── step-3-photos.tsx
│   │   │       ├── step-4-price.tsx
│   │   │       └── step-5-review.tsx
│   │   ├── auction/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── dealer/
│   │   │   └── [slug].tsx
│   │   ├── parts/
│   │   │   └── index.tsx
│   │   ├── chat/
│   │   │   └── [id].tsx
│   │   └── _layout.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   └── SkeletonLoader.tsx
│   │   ├── listings/
│   │   │   ├── ListingCard.tsx
│   │   │   ├── ListingCardHorizontal.tsx
│   │   │   ├── ListingGallery.tsx
│   │   │   ├── PriceHistory.tsx
│   │   │   ├── FraudRiskBadge.tsx
│   │   │   └── FinanceCalculator.tsx
│   │   ├── search/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── FilterBottomSheet.tsx
│   │   │   └── SearchResultCard.tsx
│   │   ├── chat/
│   │   │   ├── ChatBubble.tsx
│   │   │   ├── OfferCard.tsx
│   │   │   └── VoiceRecorder.tsx
│   │   ├── home/
│   │   │   ├── HeroBanner.tsx
│   │   │   ├── FeaturedSection.tsx
│   │   │   ├── AIAssistantButton.tsx
│   │   │   └── NewsCard.tsx
│   │   └── shared/
│   │       ├── Header.tsx
│   │       ├── TrustScore.tsx
│   │       └── VerifiedBadge.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useListings.ts
│   │   ├── useChat.ts
│   │   ├── useAuction.ts
│   │   └── useSearch.ts
│   ├── services/
│   │   ├── api.ts                   # Axios instance + interceptors
│   │   ├── auth.service.ts
│   │   ├── listing.service.ts
│   │   ├── chat.service.ts
│   │   ├── upload.service.ts
│   │   ├── socket.service.ts        # WebSocket client
│   │   └── ai.service.ts
│   ├── store/                       # Zustand state management
│   │   ├── auth.store.ts
│   │   ├── listing.store.ts
│   │   └── chat.store.ts
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── cities.ts
│   │   ├── makes.ts
│   │   └── theme.ts
│   ├── i18n/
│   │   ├── en.json
│   │   ├── ur.json
│   │   └── roman-ur.json
│   ├── utils/
│   │   ├── format.ts                # Price, date formatting PKR
│   │   ├── validation.ts
│   │   └── imageCompression.ts
│   ├── assets/
│   │   ├── images/
│   │   └── fonts/
│   ├── app.json
│   ├── babel.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                         # NestJS API Server
│   ├── src/
│   │   ├── main.ts                  # App entry point
│   │   ├── app.module.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── otp.service.ts   # Pakistan OTP
│   │   │   │   └── dto/
│   │   │   ├── users/
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── dto/
│   │   │   ├── vehicles/
│   │   │   │   ├── vehicles.module.ts
│   │   │   │   ├── vehicles.controller.ts
│   │   │   │   ├── vehicles.service.ts
│   │   │   │   ├── search.service.ts
│   │   │   │   └── dto/
│   │   │   ├── ai/
│   │   │   │   ├── ai.module.ts
│   │   │   │   ├── ai.controller.ts
│   │   │   │   ├── price-estimator.service.ts
│   │   │   │   ├── fraud-detector.service.ts
│   │   │   │   ├── description-writer.service.ts
│   │   │   │   ├── ocr.service.ts
│   │   │   │   └── chatbot.service.ts
│   │   │   ├── chat/
│   │   │   │   ├── chat.module.ts
│   │   │   │   ├── chat.gateway.ts  # WebSocket
│   │   │   │   ├── chat.service.ts
│   │   │   │   └── offers.service.ts
│   │   │   ├── auctions/
│   │   │   │   ├── auctions.module.ts
│   │   │   │   ├── auctions.gateway.ts
│   │   │   │   └── auctions.service.ts
│   │   │   ├── dealers/
│   │   │   ├── payments/
│   │   │   │   ├── jazzcash.service.ts
│   │   │   │   └── easypaisa.service.ts
│   │   │   ├── notifications/
│   │   │   │   ├── push.service.ts  # Expo Push
│   │   │   │   └── email.service.ts
│   │   │   ├── leads/
│   │   │   ├── inspections/
│   │   │   ├── admin/
│   │   │   └── uploads/
│   │   │       └── r2.service.ts    # Cloudflare R2
│   │   ├── common/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── filters/
│   │   │   ├── decorators/
│   │   │   └── pipes/
│   │   ├── database/
│   │   │   ├── database.module.ts
│   │   │   └── migrations/
│   │   └── config/
│   │       ├── app.config.ts
│   │       ├── database.config.ts
│   │       └── redis.config.ts
│   ├── test/
│   ├── Dockerfile
│   ├── .env.example
│   ├── nest-cli.json
│   ├── tsconfig.json
│   └── package.json
│
├── admin/                           # Next.js Admin Panel
│   ├── app/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── listings/
│   │   ├── dealers/
│   │   ├── auctions/
│   │   ├── reports/
│   │   ├── revenue/
│   │   ├── subscriptions/
│   │   ├── notifications/
│   │   ├── cms/
│   │   └── settings/
│   ├── components/
│   ├── Dockerfile
│   └── package.json
│
├── db/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_indexes.sql
│   │   └── 003_seed_data.sql
│   └── seeds/
│       ├── test_users.sql
│       └── sample_listings.sql
│
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── nginx/
│       └── nginx.conf
│
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       ├── admin-ci.yml
│       └── mobile-ci.yml
│
└── docs/
    ├── API.md
    ├── DEPLOYMENT.md
    └── LAUNCH_CHECKLIST.md
```

---

## API Endpoints Summary

### Auth
```
POST /auth/send-otp          # Send OTP to Pakistan number
POST /auth/verify-otp        # Verify OTP, return JWT
POST /auth/google            # Google OAuth
POST /auth/apple             # Apple OAuth
POST /auth/refresh           # Refresh token
```

### Vehicles
```
GET    /vehicles             # Search & filter listings
POST   /vehicles             # Create listing (auth)
GET    /vehicles/:id         # Listing detail
PUT    /vehicles/:id         # Update listing
DELETE /vehicles/:id         # Delete/expire
POST   /vehicles/:id/boost   # Boost listing (payment)
GET    /vehicles/featured    # Featured listings
GET    /vehicles/similar/:id # Similar cars
```

### AI
```
POST /ai/price-estimate      # Body: {make, model, year, mileage, city}
POST /ai/fraud-score         # Body: {listing_id}
POST /ai/generate-title      # Body: {make, model, year, features}
POST /ai/generate-description # Body: {vehicle_data, language}
POST /ai/chatbot             # Body: {message, session_id}
POST /ai/ocr-registration    # Body: {image_base64}
```

### Chat
```
GET  /chats                  # User's chat list
GET  /chats/:id/messages     # Messages in chat
POST /chats/:id/offer        # Make offer
WS   /chat                   # WebSocket endpoint
```

### Auctions
```
GET  /auctions               # Live/upcoming auctions
GET  /auctions/:id           # Auction detail + bids
POST /auctions/:id/bid       # Place bid
WS   /auctions/:id           # Live bid stream
```
