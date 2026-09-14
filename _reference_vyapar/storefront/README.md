# 🌿 The NutriDry — E-Commerce Platform

**Premium Dehydrated Fruits, Vegetables & Superfoods**
Built with Astro 6, React 19, Tailwind CSS 4, and Supabase.

---

## 🚀 Quick Start (Local Dev)

```bash
cd storefront
npm install
npm run dev
```

- Storefront: http://localhost:4321/
- Admin Panel: http://localhost:4321/admin/

---

## 📁 Project Structure

```
storefront/
├── src/
│   ├── pages/
│   │   ├── admin/          # Admin panel pages
│   │   ├── api/            # API routes (server-side)
│   │   ├── account/        # Customer account pages
│   │   ├── products/       # Product listing + PDP
│   │   ├── blog/           # Blog listing + articles
│   │   └── checkout/       # Checkout flow
│   ├── components/
│   │   ├── react/          # Interactive React islands
│   │   └── *.astro         # Static Astro components
│   ├── layouts/            # Layout.astro, AdminLayout.astro
│   ├── lib/
│   │   ├── database.ts     # DB layer (mock ↔ Supabase auto-switch)
│   │   ├── mockDb.ts       # Local JSON mock data
│   │   └── notifications.ts # Telegram + Resend alerts
│   └── store/cartStore.ts  # Nanostores cart state
├── public/
│   ├── products/           # Product images (.webp)
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker v2
├── catalog_data.json        # Product catalog (source of truth)
├── supabase_schema.sql      # Full DB schema — run this in Supabase
├── vercel.json             # Vercel deployment config
└── .env                    # Environment variables (never commit!)
```

---

## 🔑 Environment Variables

Fill in `.env` file before going live:

| Variable | Phase | Where to Get |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | 2 | supabase.com → Project Settings → API |
| `PUBLIC_SUPABASE_ANON_KEY` | 2 | supabase.com → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | 2 | supabase.com → Project Settings → API |
| `GEMINI_API_KEY` | 4 | aistudio.google.com/app/apikey (Free!) |
| `TWILIO_ACCOUNT_SID` | 5 | console.twilio.com |
| `TWILIO_AUTH_TOKEN` | 5 | console.twilio.com |
| `RAZORPAY_KEY_ID` | 6 | dashboard.razorpay.com |
| `RAZORPAY_KEY_SECRET` | 6 | dashboard.razorpay.com |
| `TELEGRAM_BOT_TOKEN` | 7 | @BotFather on Telegram |
| `TELEGRAM_CHAT_ID` | 7 | api.telegram.org/bot{TOKEN}/getUpdates |
| `ADMIN_PASSWORD` | Always | Set a strong password! |

> **Auto-fallback:** If Supabase keys are blank, the site uses local mock data — development always works without any DB setup.

---

## 🗄️ Supabase Setup (Phase 2)

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Once ready → **SQL Editor** → paste `supabase_schema.sql` → **Run**
3. **Project Settings → API** → copy URL + anon key + service_role key
4. Add all 3 to `.env` → restart dev server

---

## 💳 Razorpay Setup (Phase 6)

1. Create account at [razorpay.com](https://razorpay.com)
2. **Settings → API Keys → Generate Test Key**
3. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env`
4. For production: switch to live keys

---

## 📱 Telegram Bot Setup (Phase 7)

1. Open Telegram → message **@BotFather** → `/newbot` → copy token
2. Add `TELEGRAM_BOT_TOKEN` to `.env`
3. Message your bot once, then visit:
   `https://api.telegram.org/bot{TOKEN}/getUpdates`
4. Copy `chat.id` → add as `TELEGRAM_CHAT_ID`

---

## 🌐 Deploy to Vercel

### Option A: Vercel CLI

```bash
npm i -g vercel
cd storefront
vercel

# Add env vars:
vercel env add PUBLIC_SUPABASE_URL
vercel env add PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add GEMINI_API_KEY
vercel env add RAZORPAY_KEY_ID
vercel env add RAZORPAY_KEY_SECRET
vercel env add TELEGRAM_BOT_TOKEN
vercel env add TELEGRAM_CHAT_ID
vercel env add ADMIN_PASSWORD

# Deploy to production:
vercel --prod
```

### Option B: GitHub + Vercel Dashboard

1. Push code to GitHub
2. [vercel.com](https://vercel.com) → **New Project** → Import repo
3. Root Directory: `storefront` | Framework: **Astro**
4. Add all env vars in the UI
5. Click **Deploy** 🎉

---

## 🛡️ Admin Panel

URL: `/admin/` | Default password: set `ADMIN_PASSWORD` in `.env`

| Page | URL |
|---|---|
| Dashboard | `/admin/` |
| Products | `/admin/products` |
| Orders | `/admin/orders` |
| Customers | `/admin/customers` |
| Coupons | `/admin/coupons` |
| Flash Sales | `/admin/flash-sales` |
| Blog Editor | `/admin/blog` |
| Bulk Upload | `/admin/bulk-upload` |
| Settings | `/admin/settings` |

---

## 📦 Adding Products

| Method | How |
|---|---|
| Admin UI | `/admin/products` → Add New Product |
| CSV Upload | `/admin/bulk-upload` → Excel + ZIP tab → Download Template |
| AI Chat | `/admin/bulk-upload` → AI Chat tab → describe the product |
| JSON (BYO-AI) | `/admin/bulk-upload` → JSON tab → use ChatGPT/Claude |

---

## 📊 Tech Stack

| | Technology |
|---|---|
| Framework | Astro 6 (SSR) |
| UI | React 19 (islands) |
| Styling | Tailwind CSS 4 |
| State | Nanostores |
| Database | Supabase (PostgreSQL) |
| AI | Gemini 2.5 Pro |
| Payments | Razorpay + PhonePe |
| Notifications | Telegram Bot + Resend |
| Deployment | Vercel (Mumbai `bom1`) |

---

## 🏭 Business Info

- **Brand:** The NutriDry
- **FSSAI:** 12723999000668
- **Address:** 122/3, Shama Vihar Colony, Bagh No. 2, Kanpur Road, Sarojini Nagar, Lucknow - 226023
- **Phone:** +91-9984001117
- **Email:** thenutridry@gmail.com

---
*Built with ❤️ for The NutriDry | May 2026*
